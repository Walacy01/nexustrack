#!/usr/bin/env python3
"""
Utilitário de Sincronização Profunda de Metadados da Meta Graph API
"""
import sqlite3
import urllib.request
import json
import datetime
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "nexustrack.db")

TOKEN = "EAAXl0IXkTcABS7UHO1My87jQXusPU7P5gdSlLM254chYPf8lfCVhKmniiZB7nGQxPZCZCbJnZAB1THe5ZAorSRUcotISkifFpImVTLgVXQr3ad6cWyhPcZBZBK47WPJ4KzE1POz55gtNQ9W7FJRmfIyLUdwPEBBQ5m7jqn5rTeAsLWhZASHqg2q768ceISAUxTZAjMQZDZD"

def req(url):
    try:
        r = urllib.request.Request(url, headers={"User-Agent": "NexusTrack-Sync/1.0"})
        with urllib.request.urlopen(r, timeout=30) as res:
            return json.loads(res.read().decode("utf-8"))
    except Exception as e:
        print("[Erro API]:", url, e)
        return {}

def run_deep_sync():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    print("[*] Sincronizando contas de anúncios...")
    accs_res = req(f"https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_id,account_status,currency,amount_spent,balance&access_token={TOKEN}")
    
    accounts = accs_res.get("data", [])
    print(f"[*] {len(accounts)} contas autorizadas encontradas.")

    for a in accounts:
        acc_id = a["id"]
        acc_num = a["account_id"]
        acc_name = a["name"]
        spent = float(a.get("amount_spent", 0)) / 100.0
        currency = a.get("currency", "BRL")
        status = a.get("account_status", 1)

        cur.execute("""
            INSERT INTO facebook_ad_accounts (id, account_id, name, currency, account_status, amount_spent, balance, is_selected, connection_type, access_token, last_synced_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 0.0, 1, 'permanent_token', ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET 
                name = excluded.name,
                currency = excluded.currency,
                account_status = excluded.account_status,
                amount_spent = excluded.amount_spent,
                access_token = excluded.access_token,
                last_synced_at = excluded.last_synced_at
        """, (acc_id, acc_num, acc_name, currency, status, spent, TOKEN, now_iso, now_iso))

        # Campanhas
        camps_res = req(f"https://graph.facebook.com/v19.0/{acc_id}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time&access_token={TOKEN}")
        for c in camps_res.get("data", []):
            cid = c["id"]
            cname = c["name"]
            cstatus = c.get("status", "PAUSED")
            cobj = c.get("objective", "OUTCOME_SALES")
            dbudget = float(c.get("daily_budget", 0)) / 100.0 if c.get("daily_budget") else 0.0
            lbudget = float(c.get("lifetime_budget", 0)) / 100.0 if c.get("lifetime_budget") else 0.0
            created_time = c.get("created_time")

            cur.execute("""
                INSERT INTO campaigns (id, account_id, name, status, objective, daily_budget, lifetime_budget, created_time, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    status = excluded.status,
                    objective = excluded.objective,
                    daily_budget = excluded.daily_budget,
                    lifetime_budget = excluded.lifetime_budget,
                    updated_at = excluded.updated_at
            """, (cid, acc_id, cname, cstatus, cobj, dbudget, lbudget, created_time, now_iso))

        # Conjuntos de anúncios (AdSets)
        adsets_res = req(f"https://graph.facebook.com/v19.0/{acc_id}/adsets?fields=id,campaign_id,name,status,daily_budget&access_token={TOKEN}")
        for as_item in adsets_res.get("data", []):
            as_id = as_item["id"]
            as_cid = as_item.get("campaign_id")
            as_name = as_item["name"]
            as_status = as_item.get("status", "PAUSED")
            as_budget = float(as_item.get("daily_budget", 0)) / 100.0 if as_item.get("daily_budget") else 0.0

            cur.execute("""
                INSERT INTO ad_sets (id, campaign_id, account_id, name, status, daily_budget, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    status = excluded.status,
                    daily_budget = excluded.daily_budget,
                    updated_at = excluded.updated_at
            """, (as_id, as_cid, acc_id, as_name, as_status, as_budget, now_iso))

        # Anúncios (Ads / Criativos)
        ads_res = req(f"https://graph.facebook.com/v19.0/{acc_id}/ads?fields=id,adset_id,campaign_id,name,status&access_token={TOKEN}")
        for ad_item in ads_res.get("data", []):
            ad_id = ad_item["id"]
            ad_asid = ad_item.get("adset_id")
            ad_cid = ad_item.get("campaign_id")
            ad_name = ad_item["name"]
            ad_status = ad_item.get("status", "PAUSED")

            cur.execute("""
                INSERT INTO ads (id, adset_id, campaign_id, account_id, name, status, creative_name, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    status = excluded.status,
                    creative_name = excluded.creative_name,
                    updated_at = excluded.updated_at
            """, (ad_id, ad_asid, ad_cid, acc_id, ad_name, ad_status, ad_name, now_iso))

        # Insights Históricos
        ins_res = req(f"https://graph.facebook.com/v19.0/{acc_id}/insights?level=campaign&fields=campaign_id,campaign_name,spend,impressions,clicks,cpc,cpm,ctr&date_preset=maximum&access_token={TOKEN}")
        for ins in ins_res.get("data", []):
            cid = ins.get("campaign_id")
            cname = ins.get("campaign_name", "Campanha")
            spend = float(ins.get("spend", 0.0))
            imp = int(ins.get("impressions", 0))
            clk = int(ins.get("clicks", 0))
            cpc = float(ins.get("cpc", 0.0))
            cpm = float(ins.get("cpm", 0.0))
            ctr = float(ins.get("ctr", 0.0))
            ins_id = f"{acc_id}_{cid}_all"

            cur.execute("""
                INSERT INTO meta_campaign_insights (id, account_id, campaign_id, campaign_name, date_start, date_stop, spend, impressions, clicks, cpc, cpm, ctr, conversions, raw_data, updated_at)
                VALUES (?, ?, ?, ?, '2020-01-01', '2030-12-31', ?, ?, ?, ?, ?, ?, 0, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    spend = excluded.spend,
                    impressions = excluded.impressions,
                    clicks = excluded.clicks,
                    cpc = excluded.cpc,
                    cpm = excluded.cpm,
                    ctr = excluded.ctr,
                    updated_at = excluded.updated_at
            """, (ins_id, acc_id, cid, cname, spend, imp, clk, cpc, cpm, ctr, json.dumps(ins), now_iso))

    conn.commit()
    print("=" * 50)
    print("[OK] SINCRONIZACAO COMPLETA COM SUCESSO!")
    print("=" * 50)
    print("Contas:", cur.execute("SELECT COUNT(*) FROM facebook_ad_accounts").fetchone()[0])
    print("Campanhas:", cur.execute("SELECT COUNT(*) FROM campaigns").fetchone()[0])
    print("Conjuntos (AdSets):", cur.execute("SELECT COUNT(*) FROM ad_sets").fetchone()[0])
    print("Anúncios (Criativos):", cur.execute("SELECT COUNT(*) FROM ads").fetchone()[0])
    print("Insights:", cur.execute("SELECT COUNT(*) FROM meta_campaign_insights").fetchone()[0])
    conn.close()

if __name__ == "__main__":
    run_deep_sync()
