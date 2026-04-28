import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { loadData, saveData, exportJSON, importJSON } from "./storage.js";

/* ─── FONTS ──────────────────────────────────────────────────────────────── */
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;700&family=Inter:wght@400;500;600;700;800;900&display=swap');`;

/* ─── COLOR SYSTEM: Push / Pull / Legs / Gainage ────────────────────────── */
// Vibrant gradient-driven palette for a sporty, energetic look
const TYPE_COLORS = {
  Push:    { bg: "#ef4444", soft: "#ef44441f", glow: "#ef444466", grad: "linear-gradient(135deg, #f87171 0%, #dc2626 100%)", label: "Push" },
  Pull:    { bg: "#10b981", soft: "#10b9811f", glow: "#10b98166", grad: "linear-gradient(135deg, #34d399 0%, #059669 100%)", label: "Pull" },
  Legs:    { bg: "#f59e0b", soft: "#f59e0b1f", glow: "#f59e0b66", grad: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)", label: "Jambes" },
  Gainage: { bg: "#a855f7", soft: "#a855f71f", glow: "#a855f766", grad: "linear-gradient(135deg, #c084fc 0%, #9333ea 100%)", label: "Gainage" },
};
const tc = (type) => TYPE_COLORS[type] || { bg: "#64748b", soft: "#64748b1f", glow: "#64748b66", grad: "linear-gradient(135deg, #94a3b8, #475569)", label: type };

/* ─── MUSCLE GROUPS — simplified, logical ───────────────────────────────── */
// Muscles réels, pas zones anatomiques floues
const MUSCLE_GROUPS = ["Pectoraux","Épaules","Triceps","Dos","Biceps","Lombaires","Quadriceps","Ischios","Fessiers","Mollets","Abdos","Autre"];

/* ─── EXERCISE DATABASE ──────────────────────────────────────────────────── */
const INIT_EX = [
  {name:"Dvp incliné Smith",           muscle:"Pectoraux",  type:"Push", mult:2, barAdd:20},
  {name:"Dvp incliné machine conv",    muscle:"Pectoraux",  type:"Push", mult:2, barAdd:0},
  {name:"Dvp couché machine conv",     muscle:"Pectoraux",  type:"Push", mult:2, barAdd:0},
  {name:"Dvp couché haltères",         muscle:"Pectoraux",  type:"Push", mult:2, barAdd:0},
  {name:"Dvp couché barre",            muscle:"Pectoraux",  type:"Push", mult:2, barAdd:20},
  {name:"Dvp couché serré",            muscle:"Pectoraux",  type:"Push", mult:2, barAdd:20},
  {name:"Dvp incliné barre",           muscle:"Pectoraux",  type:"Push", mult:2, barAdd:20},
  {name:"Dvp assis guidé",             muscle:"Pectoraux",  type:"Push", mult:2, barAdd:0},
  {name:"Ecarté poulie moyenne",       muscle:"Pectoraux",  type:"Push", mult:2, barAdd:0},
  {name:"Ecarté poulie basse",         muscle:"Pectoraux",  type:"Push", mult:2, barAdd:0},
  {name:"Pecs fly machine",            muscle:"Pectoraux",  type:"Push", mult:2, barAdd:0},
  {name:"Dvp militaire Smith",         muscle:"Épaules",    type:"Push", mult:2, barAdd:20},
  {name:"Dvp militaire machine",       muscle:"Épaules",    type:"Push", mult:2, barAdd:0},
  {name:"Élévations latérales",        muscle:"Épaules",    type:"Pull", mult:2, barAdd:0},
  {name:"Élévations latérales poulies",muscle:"Épaules",    type:"Pull", mult:2, barAdd:0},
  {name:"Montée de barre épaules",     muscle:"Épaules",    type:"Push", mult:2, barAdd:20},
  {name:"X fly",                       muscle:"Épaules",    type:"Pull", mult:2, barAdd:0},
  {name:"Facepull poulie assis",       muscle:"Épaules",    type:"Pull", mult:1, barAdd:0},
  {name:"Triceps poulie haute corde",  muscle:"Triceps",    type:"Push", mult:1, barAdd:0},
  {name:"Triceps poulie haute barre",  muscle:"Triceps",    type:"Push", mult:1, barAdd:0},
  {name:"Triceps poulie haute arrière",muscle:"Triceps",    type:"Push", mult:1, barAdd:0},
  {name:"Extension nuque barre",       muscle:"Triceps",    type:"Push", mult:1, barAdd:20},
  {name:"Tirage horizontal serré",     muscle:"Dos",        type:"Pull", mult:1, barAdd:0},
  {name:"Pull over poulie",            muscle:"Dos",        type:"Pull", mult:1, barAdd:0},
  {name:"Tirage vertical serré",       muscle:"Dos",        type:"Pull", mult:1, barAdd:0},
  {name:"Seated row",                  muscle:"Dos",        type:"Pull", mult:1, barAdd:0},
  {name:"Seated row machine libre",    muscle:"Dos",        type:"Pull", mult:1, barAdd:0},
  {name:"Rowing bûcheron",             muscle:"Dos",        type:"Pull", mult:1, barAdd:20},
  {name:"Tractions",                   muscle:"Dos",        type:"Pull", mult:1, barAdd:0, useBodyweight:true},
  {name:"Tractions guidées machine",   muscle:"Dos",        type:"Pull", mult:1, barAdd:0},
  {name:"Lat pull machine guidée",     muscle:"Dos",        type:"Pull", mult:1, barAdd:0},
  {name:"Curl marteau poulie",         muscle:"Biceps",     type:"Pull", mult:2, barAdd:0},
  {name:"Curl marteau haltères",       muscle:"Biceps",     type:"Pull", mult:2, barAdd:0},
  {name:"Curl incliné",                muscle:"Biceps",     type:"Pull", mult:2, barAdd:0},
  {name:"Curl biceps haltères",        muscle:"Biceps",     type:"Pull", mult:2, barAdd:0},
  {name:"Curl biceps barre courbe",    muscle:"Biceps",     type:"Pull", mult:1, barAdd:0},
  {name:"Curl biceps poulie barre",    muscle:"Biceps",     type:"Pull", mult:1, barAdd:0},
  {name:"Curl poulie angle",           muscle:"Biceps",     type:"Pull", mult:1, barAdd:0},
  {name:"Extension lombaires",         muscle:"Lombaires",  type:"Pull", mult:1, barAdd:0},
  {name:"Squat kettle",                muscle:"Quadriceps", type:"Legs", mult:1, barAdd:0},
  {name:"Leg extension",               muscle:"Quadriceps", type:"Legs", mult:1, barAdd:0},
  {name:"Leg press",                   muscle:"Quadriceps", type:"Legs", mult:1, barAdd:0},
  {name:"Leg curl",                    muscle:"Ischios",    type:"Legs", mult:1, barAdd:0},
  {name:"Prone leg curl machine",      muscle:"Ischios",    type:"Legs", mult:1, barAdd:0},
  {name:"Soulevé ter. jamb tendues",   muscle:"Ischios",    type:"Legs", mult:1, barAdd:20},
  {name:"Soulevé ter. unilatéral",     muscle:"Ischios",    type:"Legs", mult:1, barAdd:20},
  {name:"Soulevé ter.",                muscle:"Ischios",    type:"Legs", mult:1, barAdd:20},
  {name:"Mollets machine",             muscle:"Mollets",    type:"Legs", mult:1, barAdd:0},
  {name:"Gainage au sol",              muscle:"Abdos",      type:"Gainage", mult:1, barAdd:0},
];

/* ─── DAYS OF WEEK ───────────────────────────────────────────────────────── */
const DAYS_OF_WEEK = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];

/* ─── WEEK PLAN (par jour, pas par date) ────────────────────────────────── */
const INIT_WEEK_PLAN = {
  "Lundi":[
    {exo:"Dvp incliné barre",objPoids:25,objReps:6,objSeries:3},
    {exo:"Dvp militaire Smith",objPoids:17.5,objReps:8,objSeries:3},
    {exo:"Élévations latérales",objPoids:7,objReps:10,objSeries:3},
    {exo:"Curl poulie angle",objPoids:9,objReps:8,objSeries:3},
    {exo:"Triceps poulie haute arrière",objPoids:11.3,objReps:9,objSeries:3},
    {exo:"Leg curl",objPoids:52,objReps:10,objSeries:3},
    {exo:"Mollets machine",objPoids:100,objReps:10,objSeries:3},
    {exo:"Seated row machine libre",objPoids:55,objReps:9,objSeries:3},
    {exo:"Leg extension",objPoids:59,objReps:8,objSeries:3},
    {exo:"Curl biceps haltères",objPoids:12,objReps:9,objSeries:3},
    {exo:"Gainage au sol",objPoids:0,objReps:1,objSeries:3},
  ],
  "Mercredi":[
    {exo:"Dvp couché barre",objPoids:20,objReps:8,objSeries:3},
    {exo:"Tractions",objPoids:0,objReps:5,objSeries:4},
    {exo:"Élévations latérales",objPoids:9,objReps:10,objSeries:3},
    {exo:"Facepull poulie assis",objPoids:27,objReps:10,objSeries:3},
    {exo:"Triceps poulie haute corde",objPoids:20.3,objReps:11,objSeries:3},
    {exo:"Curl biceps poulie barre",objPoids:20.3,objReps:8,objSeries:3},
    {exo:"Extension lombaires",objPoids:10,objReps:10,objSeries:3},
    {exo:"Leg extension",objPoids:59,objReps:9,objSeries:3},
    {exo:"Leg press",objPoids:41.3,objReps:10,objSeries:3},
    {exo:"Mollets machine",objPoids:100,objReps:10,objSeries:3},
    {exo:"Gainage au sol",objPoids:0,objReps:1,objSeries:3},
  ],
  "Vendredi":[
    {exo:"Tractions",objPoids:0,objReps:5,objSeries:4},
    {exo:"Dvp couché serré",objPoids:17.5,objReps:8,objSeries:3},
    {exo:"Rowing bûcheron",objPoids:22,objReps:10,objSeries:3},
    {exo:"Ecarté poulie moyenne",objPoids:9,objReps:13,objSeries:3},
    {exo:"Ecarté poulie basse",objPoids:6.8,objReps:10,objSeries:2},
    {exo:"X fly",objPoids:4.5,objReps:13,objSeries:3},
    {exo:"Élévations latérales poulies",objPoids:4.5,objReps:12,objSeries:3},
    {exo:"Soulevé ter. unilatéral",objPoids:12,objReps:10,objSeries:3},
    {exo:"Mollets machine",objPoids:100,objReps:10,objSeries:3},
    {exo:"Leg extension",objPoids:59,objReps:10,objSeries:3},
    {exo:"Gainage au sol",objPoids:0,objReps:1,objSeries:3},
  ],
};

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
const pf = v => parseFloat(String(v).replace(",",".")) || 0;
const realW = (poids, ex, bw=0) => {
  if (!ex) return pf(poids);
  const base = ex.useBodyweight ? (pf(poids) + bw) : pf(poids);
  return base * ex.mult + ex.barAdd;
};
const calcVol = (series, ex, bw=0) => series.reduce((s,r) => s + realW(r.poids,ex,bw)*(pf(r.reps)||0), 0);
const frSort = (a, b) => { const [da,ma,ya]=a.split("/").map(Number),[db,mb,yb]=b.split("/").map(Number); return new Date(ya,ma-1,da)-new Date(yb,mb-1,db); };
const todayFR = () => new Date().toLocaleDateString("fr-FR");
const todayWeekday = () => { const w=new Date().toLocaleDateString("fr-FR",{weekday:"long"}); return w[0].toUpperCase()+w.slice(1); };
const todayLabel = () => { const d=new Date(); const day=d.toLocaleDateString("fr-FR",{weekday:"long"}); return day[0].toUpperCase()+day.slice(1)+" "+d.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}); };
const dowOf = s => { const [d,m,y]=s.split("/").map(Number); const w=new Date(y,m-1,d).toLocaleDateString("fr-FR",{weekday:"long"}); return w[0].toUpperCase()+w.slice(1); };

const parseS = raw => raw ? raw.split(" - ").map(s=>{const p=s.split("x");return{poids:pf(p[0]),reps:pf(p[1])};}) : [];
const mkLog = (date, exo, raw, note="") => {
  const ex=INIT_EX.find(e=>e.name===exo);
  const series=parseS(raw);
  return {date,exo,muscle:ex?.muscle||"",type:ex?.type||"Push",series,volume:calcVol(series,ex,0),note,mult:ex?.mult||1,barAdd:ex?.barAdd||0,useBodyweight:ex?.useBodyweight||false};
};

/* ─── HISTORICAL LOGS ────────────────────────────────────────────────────── */
const INIT_LOGS = [
  mkLog("26/01/2026","Dvp incliné Smith","15x6 - 15x6 - 15x10"),
  mkLog("26/01/2026","Dvp militaire Smith","10x8 - 10x6 - 10x5"),
  mkLog("26/01/2026","Élévations latérales","5x8 - 5x8 - 5x8"),
  mkLog("26/01/2026","Tirage horizontal serré","45x8 - 39x8 - 39x8"),
  mkLog("26/01/2026","Curl marteau poulie","13.5x8 - 11.3x9 - 13.5x9"),
  mkLog("26/01/2026","Triceps poulie haute corde","13.5x8 - 11.3x11 - 11.3x10"),
  mkLog("26/01/2026","Squat kettle","20x8 - 20x8 - 20x8"),
  mkLog("26/01/2026","Mollets machine","32x8 - 32x8 - 32x8"),
  mkLog("28/01/2026","Dvp couché machine conv","20x8 - 22.5x8 - 25x5"),
  mkLog("28/01/2026","Pull over poulie","13.5x8 - 13.5x8 - 13.5x8"),
  mkLog("28/01/2026","Élévations latérales","5x10 - 6x8 - 6x8"),
  mkLog("28/01/2026","Montée de barre épaules","20x8 - 20x8 - 20x8"),
  mkLog("28/01/2026","Extension nuque barre","15x8 - 15x8 - 15x8"),
  mkLog("28/01/2026","Curl incliné","7x8 - 7x8 - 7x8"),
  mkLog("28/01/2026","Extension lombaires","10x10 - 10x10 - 10x10"),
  mkLog("28/01/2026","Leg extension","39x8 - 39x8 - 45x8"),
  mkLog("28/01/2026","Leg curl","39x8 - 39x8 - 45x8"),
  mkLog("28/01/2026","Mollets machine","45x10 - 45x10 - 45x10"),
  mkLog("30/01/2026","Dvp incliné machine conv","15x8 - 17.5x8 - 17.5x7"),
  mkLog("30/01/2026","Ecarté poulie moyenne","4.5x8 - 6.8x8"),
  mkLog("30/01/2026","Ecarté poulie basse","4.5x8 - 4.5x8"),
  mkLog("30/01/2026","Pull over poulie","13.5x8 - 15.8x8 - 15.8x8"),
  mkLog("30/01/2026","Facepull poulie assis","15.8x8 - 18x8 - 18x8"),
  mkLog("30/01/2026","Élévations latérales","7x8 - 7x8 - 7x8"),
  mkLog("30/01/2026","Triceps poulie haute corde","11.3x10 - 13.5x8 - 13.5x8"),
  mkLog("30/01/2026","Curl marteau haltères","12x8 - 12x8 - 12x8"),
  mkLog("02/02/2026","Dvp incliné machine conv","17.5x8 - 17.5x7 - 17.5x6"),
  mkLog("02/02/2026","Dvp militaire Smith","10x8 - 10x8 - 10x8"),
  mkLog("02/02/2026","Élévations latérales","6x10 - 6x10 - 6x10"),
  mkLog("02/02/2026","Tirage horizontal serré","45x8 - 45x8 - 45x7"),
  mkLog("02/02/2026","Curl marteau poulie","13.5x10 - 13.5x10 - 13.5x10"),
  mkLog("02/02/2026","Triceps poulie haute corde","13.5x10 - 13.5x10 - 13.5x10"),
  mkLog("02/02/2026","Squat kettle","24x8 - 24x8 - 20x8"),
  mkLog("02/02/2026","Mollets machine","39x10 - 39x10 - 39x10"),
  mkLog("04/02/2026","Dvp couché machine conv","25x8 - 25x8 - 25x8"),
  mkLog("04/02/2026","Pull over poulie","15.8x10 - 15.8x8 - 15.8x10"),
  mkLog("04/02/2026","Élévations latérales","6x10 - 6x10 - 6x10"),
  mkLog("04/02/2026","Montée de barre épaules","20x10 - 20x10 - 20x10"),
  mkLog("04/02/2026","Extension nuque barre","15x10 - 15x10 - 15x10"),
  mkLog("04/02/2026","Curl incliné","8x10 - 8x10 - 8x10"),
  mkLog("04/02/2026","Extension lombaires","10x10 - 10x10 - 10x10"),
  mkLog("04/02/2026","Leg extension","45x8 - 45x8 - 45x8"),
  mkLog("04/02/2026","Leg curl","45x8 - 39x8 - 39x10"),
  mkLog("04/02/2026","Mollets machine","52x10 - 52x10 - 52x10"),
  mkLog("06/02/2026","Dvp incliné machine conv","17.5x8 - 17.5x8 - 20x8"),
  mkLog("06/02/2026","Ecarté poulie moyenne","6.8x8 - 6.8x8"),
  mkLog("06/02/2026","Ecarté poulie basse","6.8x8 - 6.8x8"),
  mkLog("06/02/2026","Pull over poulie","18x8 - 18x8 - 18x8"),
  mkLog("06/02/2026","Facepull poulie assis","20.3x8 - 20.3x8 - 20.3x8"),
  mkLog("06/02/2026","Élévations latérales","8x8 - 8x8 - 8x8"),
  mkLog("06/02/2026","Triceps poulie haute corde","15.8x8 - 15.8x9 - 15.8x7"),
  mkLog("06/02/2026","Curl marteau haltères","14x8 - 14x8 - 14x8","Pas belles"),
  mkLog("06/02/2026","Mollets machine","59x10 - 66x10 - 66x10"),
  mkLog("06/02/2026","Leg extension","45x8 - 52x8 - 52x8"),
  mkLog("09/02/2026","Dvp incliné machine conv","17.5x8 - 17.5x8 - 20x8"),
  mkLog("09/02/2026","Dvp militaire Smith","12.5x8 - 12.5x8 - 15x6"),
  mkLog("09/02/2026","Élévations latérales","7x8 - 7x10 - 7x10"),
  mkLog("09/02/2026","Tirage horizontal serré","45x8 - 45x8 - 45x8"),
  mkLog("09/02/2026","Curl marteau poulie","15.8x10 - 15.8x10 - 18x10"),
  mkLog("09/02/2026","Triceps poulie haute corde","15.8x10 - 15.8x8 - 15.8x10","Pas belles"),
  mkLog("09/02/2026","Squat kettle","24x8 - 24x8 - 24x8"),
  mkLog("09/02/2026","Mollets machine","66x10 - 66x10 - 66x10"),
  mkLog("11/02/2026","Dvp couché machine conv","30x8 - 30x8 - 30x8"),
  mkLog("11/02/2026","Pull over poulie","18x8 - 18x8 - 18x8"),
  mkLog("11/02/2026","Élévations latérales","8x8 - 8x8 - 8x8"),
  mkLog("11/02/2026","Montée de barre épaules","25x10 - 25x10 - 25x8"),
  mkLog("11/02/2026","Extension nuque barre","20x10 - 20x10 - 20x10"),
  mkLog("11/02/2026","Curl incliné","8x8 - 8x8 - 8x8"),
  mkLog("11/02/2026","Extension lombaires","10x10 - 10x10 - 10x10"),
  mkLog("11/02/2026","Leg extension","52x8 - 52x8 - 52x8"),
  mkLog("11/02/2026","Leg curl","45x8 - 52x8 - 52x8"),
  mkLog("11/02/2026","Mollets machine","73x10 - 73x10 - 73x10"),
  mkLog("13/02/2026","Dvp incliné machine conv","20x8 - 20x8 - 20x12"),
  mkLog("13/02/2026","Ecarté poulie moyenne","9x8 - 9x8"),
  mkLog("13/02/2026","Ecarté poulie basse","9x8 - 6.8x12","Pas belles à 9"),
  mkLog("13/02/2026","Pull over poulie","20.3x8 - 20.3x8 - 20.3x8"),
  mkLog("13/02/2026","Facepull poulie assis","20.3x8 - 20.3x8 - 20.3x8"),
  mkLog("13/02/2026","Élévations latérales","7x10 - 7x10 - 7x10"),
  mkLog("13/02/2026","Triceps poulie haute corde","15.8x10 - 15.8x10 - 15.8x10"),
  mkLog("13/02/2026","Curl marteau haltères","14x8 - 14x8 - 14x8"),
  mkLog("13/02/2026","Mollets machine","73x10 - 73x10 - 73x12"),
  mkLog("13/02/2026","Leg curl","45x8 - 45x8 - 45x8"),
  mkLog("13/02/2026","Leg press","59x8 - 59x8 - 59x8"),
  mkLog("16/02/2026","Dvp incliné machine conv","25x8 - 25x8 - 25x8"),
  mkLog("16/02/2026","Dvp militaire Smith","12.5x8 - 12.5x8 - 12.5x10"),
  mkLog("16/02/2026","Élévations latérales","8x9 - 8x9 - 8x9","Pas belles à 9"),
  mkLog("16/02/2026","Curl marteau poulie","18x8 - 18x8 - 18x8"),
  mkLog("16/02/2026","Triceps poulie haute corde","15.8x8 - 15.8x12 - 15.8x10"),
  mkLog("16/02/2026","Squat kettle","24x8 - 24x8 - 24x8"),
  mkLog("16/02/2026","Mollets machine","73x12 - 73x12 - 73x12"),
  mkLog("16/02/2026","Tirage vertical serré","45x8 - 45x8 - 45x7","Pas belles"),
  mkLog("16/02/2026","Soulevé ter. jamb tendues","24x10 - 24x10 - 24x10"),
  mkLog("18/02/2026","Dvp couché machine conv","35x8 - 35x8 - 35x8"),
  mkLog("18/02/2026","Pull over poulie","22.5x8 - 22.5x8 - 22.5x8","Dernière pas belle"),
  mkLog("18/02/2026","Élévations latérales","9x8 - 9x8 - 9x8"),
  mkLog("18/02/2026","Montée de barre épaules","25x10 - 25x10 - 25x7"),
  mkLog("18/02/2026","Extension nuque barre","20x10 - 20x10 - 20x10"),
  mkLog("18/02/2026","Curl incliné","9x8 - 9x8 - 9x8"),
  mkLog("18/02/2026","Extension lombaires","10x10 - 10x10 - 10x10"),
  mkLog("18/02/2026","Leg extension","59x8 - 59x8 - 59x8"),
  mkLog("18/02/2026","Leg curl","52x8 - 52x8 - 52x8"),
  mkLog("18/02/2026","Mollets machine","79x10 - 79x10 - 79x10"),
  mkLog("20/02/2026","Dvp incliné machine conv","27.5x8 - 27.5x8 - 27.5x8"),
  mkLog("20/02/2026","Ecarté poulie moyenne","9x8 - 9x8","Dernière pas belle"),
  mkLog("20/02/2026","Ecarté poulie basse","6.8x12 - 6.8x12"),
  mkLog("20/02/2026","Pull over poulie","22.5x8 - 22.5x8 - 22.5x8"),
  mkLog("20/02/2026","Facepull poulie assis","22.2x8 - 22.5x8 - 22.5x10"),
  mkLog("20/02/2026","Élévations latérales","9x8 - 9x8 - 9x8"),
  mkLog("20/02/2026","Triceps poulie haute barre","15.8x10 - 18x10 - 18x10","Barre au lieu de corde"),
  mkLog("20/02/2026","Curl marteau haltères","16x8 - 16x8 - 16x8"),
  mkLog("20/02/2026","Mollets machine","81.3x10 - 81.3x10 - 81.3x10"),
  mkLog("20/02/2026","Prone leg curl machine","36x8 - 36x8 - 32x8"),
  mkLog("20/02/2026","Leg press","59x9 - 59x9 - 59x9"),
  mkLog("23/02/2026","Dvp incliné machine conv","30x8 - 30x8 - 30x8","Dernière très difficile"),
  mkLog("23/02/2026","Dvp militaire Smith","15x8 - 15x8 - 15x6"),
  mkLog("23/02/2026","Élévations latérales","9x8 - 9x8 - 9x8"),
  mkLog("23/02/2026","Curl marteau poulie","20.3x8 - 20.3x8 - 20.3x8"),
  mkLog("23/02/2026","Triceps poulie haute corde","18x8 - 18x8 - 15.8x10"),
  mkLog("23/02/2026","Squat kettle","24x8 - 24x8 - 24x8"),
  mkLog("23/02/2026","Mollets machine","86x10 - 86x10 - 86x10"),
  mkLog("23/02/2026","Tirage vertical serré","45x8 - 52x8 - 52x8"),
  mkLog("23/02/2026","Soulevé ter. jamb tendues","24x10 - 24x10 - 24x10"),
  mkLog("23/02/2026","Seated row","45x10 - 45x10 - 45x10"),
  mkLog("25/02/2026","Dvp couché machine conv","37.5x6 - 37.5x6 - 37.5x7"),
  mkLog("25/02/2026","Pull over poulie","22.5x10 - 22.5x8 - 22.5x8"),
  mkLog("25/02/2026","Élévations latérales","9x8 - 9x8 - 9x8"),
  mkLog("25/02/2026","Montée de barre épaules","25x10 - 25x10 - 25x10"),
  mkLog("25/02/2026","Extension nuque barre","25x10 - 25x10 - 25x10"),
  mkLog("25/02/2026","Curl incliné","9x10 - 9x10 - 9x10"),
  mkLog("25/02/2026","Extension lombaires","10x10 - 10x10 - 10x10"),
  mkLog("25/02/2026","Leg extension","66x8 - 66x8 - 66x8"),
  mkLog("25/02/2026","Leg curl","59x6 - 52x8"),
  mkLog("27/02/2026","Dvp incliné machine conv","30x7 - 30x7 - 30x8"),
  mkLog("27/02/2026","Ecarté poulie moyenne","9x10 - 9x10"),
  mkLog("27/02/2026","Ecarté poulie basse","9x8 - 9x8"),
  mkLog("27/02/2026","Pull over poulie","24.8x8 - 24.8x8 - 24.8x8","Dernière pas belle"),
  mkLog("27/02/2026","X fly","4.5x8 - 4.5x8 - 4.5x7"),
  mkLog("27/02/2026","Élévations latérales","9x7 - 9x8 - 9x8"),
  mkLog("27/02/2026","Triceps poulie haute barre","18x10 - 18x10 - 18x12"),
  mkLog("27/02/2026","Curl marteau haltères","14x10 - 14x10 - 14x10"),
  mkLog("27/02/2026","Mollets machine","86x12 - 86x12 - 86x12"),
  mkLog("27/02/2026","Prone leg curl machine","36x8 - 36x7 - 36x9","Dernières pas belles"),
  mkLog("27/02/2026","Leg press","61.2x8 - 61.2x8 - 61.2x8"),
  mkLog("02/03/2026","Dvp incliné machine conv","32.5x8 - 32.5x8 - 32.5x6"),
  mkLog("02/03/2026","Dvp militaire machine","15x10 - 15x10 - 15x10"),
  mkLog("02/03/2026","Élévations latérales","7x10 - 7x10 - 7x10"),
  mkLog("20/04/2026","Dvp incliné barre","22.5x6 - 22.5x6 - 22.5x5"),
  mkLog("20/04/2026","Dvp militaire Smith","17.5x8 - 17.5x8 - 17.5x8"),
  mkLog("20/04/2026","Élévations latérales","9x10 - 9x10 - 9x10"),
  mkLog("20/04/2026","Curl poulie angle","9x8 - 9x8 - 9x8"),
  mkLog("20/04/2026","Triceps poulie haute arrière","11.3x12 - 13.5x10 - 13.5x10"),
  mkLog("20/04/2026","Leg curl","52x10 - 52x10 - 52x10"),
  mkLog("20/04/2026","Mollets machine","100x10 - 100x10 - 100x10"),
  mkLog("20/04/2026","Seated row machine libre","40x12 - 40x12 - 40x12"),
  mkLog("20/04/2026","Leg extension","59x8 - 59x8 - 59x8"),
  mkLog("20/04/2026","Curl biceps haltères","12x6 - 12x8 - 12x8"),
  mkLog("20/04/2026","Gainage au sol","0x1"),
  mkLog("22/04/2026","Dvp couché barre","20x8 - 20x8 - 20x7"),
  mkLog("22/04/2026","Tractions","0x4 - 0x4 - 0x4 - 0x4","Dernières pas belles"),
  mkLog("22/04/2026","Élévations latérales","9x10 - 9x10 - 9x10"),
  mkLog("22/04/2026","Facepull poulie assis","27x10 - 27x10 - 27x8"),
  mkLog("22/04/2026","Triceps poulie haute corde","24.8x8 - 20.3x10 - 20.3x12"),
  mkLog("22/04/2026","Extension lombaires","10x10 - 10x10"),
  mkLog("22/04/2026","Leg extension","59x8 - 59x8 - 59x8"),
  mkLog("22/04/2026","Mollets machine","100x10 - 100x10 - 100x10"),
  mkLog("22/04/2026","Gainage au sol","0x1"),

];

/* ─── STYLE TOKENS ───────────────────────────────────────────────────────── */
// Modern sporty dark theme — true black, generous contrast, vivid accents
const T = {
  bg:      "#08080a",
  bgGrad:  "radial-gradient(ellipse 80% 60% at 50% 0%, #1a1a22 0%, #08080a 60%)",
  card:    "#141418",
  cardHi:  "#1c1c22",
  card2:   "#22222a",
  border:  "#2a2a32",
  borderHi:"#3f3f48",
  text:    "#fafaf9",
  textDim: "#d4d4d8",
  dim:     "#a1a1aa",
  faint:   "#52525b",
  ghost:   "#27272a",
  red:     "#ef4444",
  green:   "#10b981",
  amber:   "#f59e0b",
  purple:  "#a855f7",
  inp:     {background:"#1c1c22",color:"#fafaf9",border:"1.5px solid #2a2a32",borderRadius:12,fontFamily:"'Inter',sans-serif",fontSize:15,outline:"none",width:"100%",padding:"13px 14px",fontWeight:500,transition:"border-color .15s, background .15s"},
  lbl:     {fontSize:10,color:"#71717a",fontFamily:"'IBM Plex Mono'",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6,display:"block",fontWeight:700},
  shadow:  "0 4px 16px rgba(0,0,0,.4)",
};
const btn = (bg="#ef4444",fg="#fff",extra={}) => ({background:bg,color:fg,border:"none",borderRadius:12,padding:"13px 20px",fontFamily:"'Inter',sans-serif",fontSize:14,cursor:"pointer",fontWeight:700,letterSpacing:.2,transition:"transform .1s, opacity .15s, background .15s",WebkitTapHighlightColor:"transparent",...extra});
const ghostBtn = (extra={}) => ({background:"transparent",color:T.dim,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"12px 18px",fontFamily:"'Inter',sans-serif",fontSize:14,cursor:"pointer",fontWeight:600,transition:"all .15s",WebkitTapHighlightColor:"transparent",...extra});

/* ─── CONFIRM MODAL (réutilisable pour toutes les suppressions) ──────────── */
function ConfirmModal({title="Confirmer",message,confirmLabel="Supprimer",cancelLabel="Annuler",danger=true,onConfirm,onClose}) {
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"#000c",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(4px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:18,padding:"22px 22px 18px",width:"100%",maxWidth:380,border:`1px solid ${T.border}`,boxShadow:T.shadow}}>
        <div style={{fontFamily:"'Inter',sans-serif",fontSize:18,fontWeight:800,color:T.text,marginBottom:8,letterSpacing:-.2}}>{title}</div>
        <div style={{fontSize:14,color:T.dim,lineHeight:1.5,marginBottom:20}}>{message}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <button onClick={onClose} style={ghostBtn({padding:"14px",fontSize:14})}>{cancelLabel}</button>
          <button onClick={()=>{onConfirm();onClose();}} style={btn(danger?T.red:T.green,"#fff",{padding:"14px",fontSize:14})}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── TIMER ──────────────────────────────────────────────────────────────── */
function Timer({onClose}) {
  const P=[60,90,120,180];
  const [t,setT]=useState(90),[r,setR]=useState(90),[run,setRun]=useState(false),[done,setDone]=useState(false);
  const iv=useRef();
  const go=s=>{clearInterval(iv.current);setT(s);setR(s);setDone(false);setRun(true);iv.current=setInterval(()=>setR(x=>{if(x<=1){clearInterval(iv.current);setRun(false);setDone(true);return 0;}return x-1;}),1000);};
  useEffect(()=>()=>clearInterval(iv.current),[]);
  const R=72,C=2*Math.PI*R,pct=t>0?1-r/t:1;
  const accent = done?T.green:T.red;
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"#000c",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:24,padding:"32px 28px 26px",textAlign:"center",minWidth:300,boxShadow:`0 8px 40px rgba(0,0,0,.5), 0 0 0 1px ${T.border}`}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:13,letterSpacing:6,color:T.dim,marginBottom:20}}>REPOS</div>
        <svg width={170} height={170} style={{display:"block",margin:"0 auto 18px"}}>
          <circle cx={85} cy={85} r={R} fill="none" stroke={T.ghost} strokeWidth={9}/>
          <circle cx={85} cy={85} r={R} fill="none" stroke={accent} strokeWidth={9} strokeDasharray={C} strokeDashoffset={C-pct*C} strokeLinecap="round" transform="rotate(-90 85 85)" style={{transition:"stroke-dashoffset 1s linear,stroke .3s",filter:`drop-shadow(0 0 8px ${accent}88)`}}/>
          <text x={85} y={95} textAnchor="middle" fill={accent} style={{fontFamily:"'Bebas Neue'",fontSize:done?44:40,letterSpacing:1}}>{done?"GO":`${String(Math.floor(r/60)).padStart(2,"0")}:${String(r%60).padStart(2,"0")}`}</text>
        </svg>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:18}}>
          {P.map(s=><button key={s} onClick={()=>go(s)} style={{background:t===s&&(run||done)?T.text:T.ghost,color:t===s&&(run||done)?T.bg:T.textDim,border:"none",borderRadius:10,padding:"10px 0",fontFamily:"'IBM Plex Mono'",fontSize:12,cursor:"pointer",fontWeight:700,letterSpacing:.5,WebkitTapHighlightColor:"transparent"}}>{s<60?`${s}s`:`${s/60}m`}</button>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:run?"1fr 1fr":"2fr 1fr",gap:8}}>
          {run?<button onClick={()=>{clearInterval(iv.current);setRun(false);}} style={btn(T.ghost,T.text,{padding:"14px",fontSize:15})}>⏸ Pause</button>:<button onClick={()=>go(t)} style={btn(accent,"#fff",{padding:"14px",fontSize:15,boxShadow:`0 4px 16px ${accent}66`})}>▶ Démarrer</button>}
          <button onClick={onClose} style={ghostBtn({padding:"14px",fontSize:15})}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

/* ─── EXERCISE CARD (séance) ─────────────────────────────────────────────── */
function ExCard({plan, exDB, onLog, todayLogs, allLogs, bw}) {
  const ex = exDB.find(e=>e.name===plan.exo);
  const tcol = tc(ex?.type||"Push");
  const col = tcol.bg;
  const [open,setOpen]=useState(false);
  const [series,setSeries]=useState(Array.from({length:plan.objSeries},()=>({poids:String(plan.objPoids||""),reps:"",done:false})));
  const [note,setNote]=useState("");

  const exLogs = allLogs.filter(l=>l.exo===plan.exo).sort((a,b)=>frSort(b.date,a.date));
  const lastLog = exLogs[0];
  const lastPerf = lastLog ? lastLog.series.map(s=>`${s.poids}×${s.reps}`).join("  ") : "—";
  const prPoids = exLogs.reduce((best,l)=>{l.series.forEach(s=>{const rw=realW(s.poids,ex,bw);if(rw>best)best=rw;});return best;},0);
  const prVol = exLogs.reduce((best,l)=>l.volume>best?l.volume:best,0);
  const objVol = realW(plan.objPoids,ex,bw)*plan.objReps*plan.objSeries;

  const alreadyLogged = todayLogs.some(l=>l.exo===plan.exo);
  const filled = series.filter(s=>s.reps!=="");
  const vol = calcVol(filled,ex,bw);
  const nDone = series.filter(s=>s.done).length;
  const allDone = series.length>0&&series.every(s=>s.done&&s.reps!=="");

  const upd=(i,f,v)=>setSeries(p=>p.map((s,j)=>j===i?{...s,[f]:v}:s));
  const tog=(i)=>setSeries(p=>p.map((s,j)=>j===i?{...s,done:!s.done}:s));
  const doLog=()=>{
    if(!filled.length)return;
    onLog({date:todayFR(),exo:plan.exo,muscle:ex?.muscle||"",type:ex?.type||"Push",series:filled,volume:calcVol(filled,ex,bw),objVolume:objVol,note,mult:ex?.mult||1,barAdd:ex?.barAdd||0,useBodyweight:ex?.useBodyweight||false,ts:Date.now()});
    setOpen(false);
  };

  // Compact card — closed
  if(!open) return(
    <button onClick={()=>setOpen(true)} style={{background:alreadyLogged?T.card:T.cardHi,borderRadius:14,padding:"14px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${alreadyLogged?T.green+"44":T.border}`,marginBottom:10,width:"100%",textAlign:"left",position:"relative",overflow:"hidden",WebkitTapHighlightColor:"transparent",fontFamily:"'Inter',sans-serif"}}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:4,background:alreadyLogged?T.green:tcol.grad}}/>
      <div style={{flex:1,paddingLeft:6,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
          <span style={{fontWeight:800,fontSize:16,color:T.text,letterSpacing:-.2}}>{plan.exo}</span>
          {alreadyLogged&&<span style={{fontSize:10,background:T.green+"22",color:T.green,borderRadius:6,padding:"2px 7px",fontWeight:800,letterSpacing:.5}}>VALIDÉ</span>}
        </div>
        <div style={{fontSize:13,color:T.dim,fontFamily:"'IBM Plex Mono'",fontWeight:600}}>
          <span style={{color:col}}>{plan.objPoids>0?`${plan.objPoids}kg`:"PDC"}</span>
          <span style={{margin:"0 6px",color:T.faint}}>×</span>
          <span>{plan.objReps}</span>
          <span style={{margin:"0 6px",color:T.faint}}>×</span>
          <span>{plan.objSeries}</span>
          {!alreadyLogged&&nDone>0&&<span style={{marginLeft:10,color:col,fontWeight:800}}>· {nDone}/{series.length}</span>}
        </div>
      </div>
      <span style={{color:T.faint,fontSize:24,paddingLeft:8,fontWeight:300}}>›</span>
    </button>
  );

  // Open card — full editor
  return(
    <div style={{background:T.cardHi,borderRadius:16,marginBottom:10,border:`1px solid ${T.border}`,overflow:"hidden",boxShadow:T.shadow,position:"relative"}}>
      <div style={{height:4,background:tcol.grad}}/>
      {/* Header */}
      <div style={{padding:"16px 16px 4px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,flexWrap:"wrap"}}>
            <span style={{fontWeight:900,fontSize:18,color:T.text,letterSpacing:-.3}}>{plan.exo}</span>
            <span style={{fontSize:10,background:tcol.soft,color:col,borderRadius:6,padding:"3px 8px",fontFamily:"'IBM Plex Mono'",fontWeight:800,letterSpacing:.5}}>{ex?.type?.toUpperCase()}</span>
            {ex?.useBodyweight&&<span style={{fontSize:10,background:T.ghost,color:T.dim,borderRadius:6,padding:"3px 8px",fontFamily:"'IBM Plex Mono'",fontWeight:700}}>PDC +{bw}kg</span>}
          </div>
          {/* Stats mini-grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
            {[
              {l:"DERNIÈRE",v:lastPerf,c:T.text},
              {l:"OBJ. VOL",v:objVol>0?`${objVol.toFixed(0)} kg`:"—",c:col},
              {l:"PR POIDS",v:prPoids>0?`${prPoids.toFixed(1)} kg`:"—",c:T.green},
              {l:"PR VOLUME",v:prVol>0?`${prVol.toFixed(0)} kg`:"—",c:T.amber},
            ].map(({l,v,c})=>(
              <div key={l} style={{background:T.card2,borderRadius:10,padding:"8px 10px",border:`1px solid ${T.border}`}}>
                <div style={{fontSize:9,color:T.faint,fontFamily:"'IBM Plex Mono'",letterSpacing:1.2,marginBottom:3,fontWeight:700}}>{l}</div>
                <div style={{fontSize:13,fontFamily:"'IBM Plex Mono'",color:c,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <button onClick={()=>setOpen(false)} style={{background:T.ghost,border:"none",color:T.dim,cursor:"pointer",fontSize:18,padding:"8px 10px",borderRadius:10,WebkitTapHighlightColor:"transparent"}}>✕</button>
      </div>

      <div style={{padding:"0 16px 16px"}}>
        {/* Column headers */}
        <div style={{display:"grid",gridTemplateColumns:"24px 1fr 1fr 50px 36px",gap:8,marginBottom:6,padding:"0 2px"}}>
          <div/><div style={{...T.lbl,textAlign:"center",marginBottom:0}}>KG</div><div style={{...T.lbl,textAlign:"center",marginBottom:0}}>REPS</div><div style={{...T.lbl,textAlign:"center",marginBottom:0}}>FAIT</div><div/>
        </div>
        {series.map((s,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"24px 1fr 1fr 50px 36px",gap:8,marginBottom:9,alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:s.done?T.green:T.faint,fontFamily:"'Bebas Neue'",letterSpacing:1}}>{i+1}</div>
            <input type="number" step="0.5" inputMode="decimal" value={s.poids} onChange={e=>upd(i,"poids",e.target.value)} placeholder={String(plan.objPoids||0)}
              style={{...T.inp,fontSize:22,fontWeight:900,textAlign:"center",color:s.done?T.green:T.text,borderColor:s.done?T.green+"66":T.border,padding:"14px 4px",background:s.done?T.green+"0e":T.card2}}/>
            <input type="number" inputMode="numeric" value={s.reps} onChange={e=>upd(i,"reps",e.target.value)} placeholder={String(plan.objReps)}
              style={{...T.inp,fontSize:22,fontWeight:900,textAlign:"center",color:s.done?T.green:T.text,borderColor:s.done?T.green+"66":T.border,padding:"14px 4px",background:s.done?T.green+"0e":T.card2}}/>
            <button onClick={()=>tog(i)} style={{background:s.done?T.green:"transparent",border:`2px solid ${s.done?T.green:T.borderHi}`,borderRadius:12,cursor:"pointer",fontSize:22,color:s.done?"#fff":T.faint,display:"flex",alignItems:"center",justifyContent:"center",padding:0,height:50,WebkitTapHighlightColor:"transparent",transition:"all .15s",fontWeight:800}}>
              {s.done?"✓":""}
            </button>
            <button onClick={()=>setSeries(p=>p.filter((_,j)=>j!==i))} style={{background:"transparent",border:"none",cursor:"pointer",color:T.faint,fontSize:22,height:50,WebkitTapHighlightColor:"transparent"}}>×</button>
          </div>
        ))}
        <button onClick={()=>setSeries(p=>[...p,{poids:p[p.length-1]?.poids||String(plan.objPoids||""),reps:"",done:false}])}
          style={{background:"transparent",border:`1.5px dashed ${T.border}`,borderRadius:12,color:T.dim,fontSize:13,cursor:"pointer",padding:"11px",width:"100%",marginBottom:14,fontFamily:"'Inter',sans-serif",fontWeight:600,WebkitTapHighlightColor:"transparent"}}>
          + Ajouter une série
        </button>
        {vol>0&&(
          <div style={{marginBottom:14,background:T.card2,borderRadius:12,padding:"10px 12px",border:`1px solid ${T.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:7,fontSize:13,fontWeight:700}}>
              <span style={{color:T.textDim}}>Volume <strong style={{color:col,fontFamily:"'IBM Plex Mono'",marginLeft:4}}>{vol.toFixed(0)} kg</strong></span>
              {objVol>0&&<span style={{color:vol>=objVol?T.green:T.dim,fontFamily:"'IBM Plex Mono'"}}>{vol>=objVol?"✓ atteint":`/ ${objVol.toFixed(0)} kg`}</span>}
            </div>
            {objVol>0&&<div style={{height:5,background:T.ghost,borderRadius:3,overflow:"hidden"}}><div style={{width:`${Math.min(vol/objVol*100,100)}%`,height:"100%",background:vol>=objVol?T.green:tcol.grad,borderRadius:3,transition:"width .4s"}}/></div>}
          </div>
        )}
        <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Remarque…"
          style={{...T.inp,marginBottom:14,fontSize:14}}/>
        <button onClick={doLog} disabled={!filled.length} style={{...btn(allDone?T.green:col,"#fff"),width:"100%",padding:"16px",fontSize:16,opacity:filled.length?1:.4,boxShadow:filled.length?`0 4px 16px ${(allDone?T.green:col)}55`:"none",fontWeight:800,letterSpacing:.3}}>
          {alreadyLogged?"↻ RE-VALIDER":"✓ VALIDER LA SÉRIE"}
        </button>
      </div>
    </div>
  );
}

/* ─── PLANNER ────────────────────────────────────────────────────────────── */
function Planner({weekPlan, setWeekPlan, exDB, allLogs, bw}) {
  const days = Object.keys(weekPlan).sort((a,b)=>DAYS_OF_WEEK.indexOf(a)-DAYS_OF_WEEK.indexOf(b));
  const [sel,setSel]=useState(days[0]||"");
  const [step,setStep]=useState("list"); // list | addex | confirm
  const [search,setSearch]=useState("");
  const [pickedEx,setPickedEx]=useState(null);
  const [form,setForm]=useState({objPoids:"",objReps:"8",objSeries:"3"});
  const [editIdx,setEditIdx]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [showAddDay,setShowAddDay]=useState(false);
  const [muscleFilter,setMuscleFilter]=useState("Tous");
  const [confirm,setConfirm]=useState(null); // {title,message,onConfirm}

  useEffect(()=>{
    const d=Object.keys(weekPlan).sort((a,b)=>DAYS_OF_WEEK.indexOf(a)-DAYS_OF_WEEK.indexOf(b));
    if(d.length>0&&!weekPlan[sel])setSel(d[0]);
  },[JSON.stringify(Object.keys(weekPlan))]);

  const currPlan = weekPlan[sel]||[];
  const set = (day,p) => setWeekPlan(prev=>({...prev,[day]:p}));
  const availableDays = DAYS_OF_WEEK.filter(d=>!weekPlan[d]);

  const addDay=(day)=>{setWeekPlan(prev=>({...prev,[day]:[]}));setSel(day);setShowAddDay(false);};
  const removeDay=(day)=>{
    setWeekPlan(prev=>{const n={...prev};delete n[day];return n;});
    const remaining=Object.keys(weekPlan).filter(d=>d!==day).sort((a,b)=>DAYS_OF_WEEK.indexOf(a)-DAYS_OF_WEEK.indexOf(b));
    setSel(remaining[0]||"");
  };

  // Stats per exercise
  const exStats = useMemo(()=>{
    const m={};
    exDB.forEach(ex=>{
      const lg=allLogs.filter(l=>l.exo===ex.name).sort((a,b)=>frSort(b.date,a.date));
      m[ex.name]={
        lastPerf:lg[0]?lg[0].series.map(s=>`${s.poids}×${s.reps}`).join(" "):"—",
        lastDate:lg[0]?.date||null,
        prPoids:lg.reduce((b,l)=>{l.series.forEach(s=>{const rw=realW(s.poids,ex,bw);if(rw>b)b=rw;});return b;},0),
        prVol:lg.reduce((b,l)=>l.volume>b?l.volume:b,0),
        nSessions:lg.length,
      };
    });
    return m;
  },[allLogs,exDB,bw]);

  const muscles=["Tous",...MUSCLE_GROUPS.filter(m=>exDB.some(e=>e.muscle===m))];
  const filteredEx=exDB.filter(e=>{
    if(muscleFilter!=="Tous"&&e.muscle!==muscleFilter)return false;
    if(search&&!e.name.toLowerCase().includes(search.toLowerCase())&&!e.muscle.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  const confirmAdd=()=>{
    if(!pickedEx)return;
    set(sel,[...currPlan,{exo:pickedEx.name,objPoids:pf(form.objPoids),objReps:parseInt(form.objReps)||8,objSeries:parseInt(form.objSeries)||3}]);
    setStep("list");setPickedEx(null);setForm({objPoids:"",objReps:"8",objSeries:"3"});setSearch("");
  };

  const st=pickedEx?exStats[pickedEx.name]:null;
  const objVol=pickedEx?realW(pf(form.objPoids),pickedEx,bw)*pf(form.objReps)*pf(form.objSeries):0;

  const askRemoveDay=(day)=>setConfirm({title:"Supprimer ce jour ?",message:`Le plan du ${day} et ses ${(weekPlan[day]||[]).length} exercices seront supprimés.`,onConfirm:()=>removeDay(day)});
  const askRemoveExo=(i,name)=>setConfirm({title:"Retirer l'exercice ?",message:`"${name}" sera retiré du plan ${sel}.`,onConfirm:()=>set(sel,currPlan.filter((_,j)=>j!==i))});

  // Step: choose exercise
  if(step==="addex") return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <button onClick={()=>{setStep("list");setSearch("");}} style={ghostBtn({padding:"10px 14px",fontSize:13})}>← Retour</button>
        <span style={{fontWeight:800,fontSize:18,color:T.text,letterSpacing:-.3}}>Choisir un exercice</span>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un exercice…" style={{...T.inp,fontSize:15}}/>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {muscles.map(m=><button key={m} onClick={()=>setMuscleFilter(m)} style={{background:muscleFilter===m?T.text:T.ghost,color:muscleFilter===m?T.bg:T.textDim,border:"none",borderRadius:10,padding:"7px 13px",fontSize:11,cursor:"pointer",fontFamily:"'IBM Plex Mono'",fontWeight:800,letterSpacing:.5,WebkitTapHighlightColor:"transparent"}}>{m.toUpperCase()}</button>)}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:480,overflowY:"auto"}}>
        {filteredEx.map(ex=>{
          const s=exStats[ex.name];
          const tcc=tc(ex.type);
          return(
            <button key={ex.name} onClick={()=>{setPickedEx(ex);setStep("confirm");}} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,position:"relative",overflow:"hidden",WebkitTapHighlightColor:"transparent",fontFamily:"'Inter',sans-serif"}}>
              <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:tcc.grad}}/>
              <div style={{flex:1,minWidth:0,paddingLeft:6}}>
                <div style={{fontWeight:800,fontSize:14,color:T.text,letterSpacing:-.2}}>{ex.name}</div>
                <div style={{fontSize:11,color:T.dim,marginTop:3,fontWeight:500}}>{ex.muscle} {ex.mult>1?`· ×${ex.mult} bras`:""}{ex.barAdd>0?` · +${ex.barAdd}kg`:""}</div>
              </div>
              <div style={{textAlign:"right",fontSize:11,fontFamily:"'IBM Plex Mono'",color:T.dim,whiteSpace:"nowrap"}}>
                {s.prPoids>0&&<div style={{color:T.green,fontWeight:800}}>PR {s.prPoids.toFixed(1)}kg</div>}
                {s.nSessions>0&&<div style={{fontWeight:600,marginTop:2}}>{s.nSessions} séances</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Step: set objective with full stats
  if(step==="confirm"&&pickedEx){
    const tcc=tc(pickedEx.type);
    return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <button onClick={()=>setStep("addex")} style={ghostBtn({padding:"10px 14px",fontSize:13})}>← Retour</button>
        <span style={{fontWeight:800,fontSize:18,color:T.text,letterSpacing:-.3,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pickedEx.name}</span>
      </div>
      {/* Historical stats */}
      <div style={{background:T.card,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",left:0,top:0,right:0,height:3,background:tcc.grad}}/>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:14,letterSpacing:3,color:T.dim,marginBottom:12,marginTop:4}}>HISTORIQUE</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[
            {l:"DERNIÈRE PERF",v:st?.lastPerf||"—",c:T.text},
            {l:"DERNIÈRE DATE",v:st?.lastDate||"—",c:T.dim},
            {l:"PR POIDS",v:st?.prPoids>0?`${st.prPoids.toFixed(1)} kg`:"—",c:T.green},
            {l:"PR VOLUME",v:st?.prVol>0?`${st.prVol.toFixed(0)} kg`:"—",c:T.amber},
          ].map(({l,v,c})=>(
            <div key={l} style={{background:T.card2,borderRadius:10,padding:"9px 11px",border:`1px solid ${T.border}`}}>
              <div style={{fontSize:9,color:T.faint,fontFamily:"'IBM Plex Mono'",letterSpacing:1.2,marginBottom:3,fontWeight:700}}>{l}</div>
              <div style={{fontSize:13,color:c,fontWeight:800,fontFamily:"'IBM Plex Mono'"}}>{v}</div>
            </div>
          ))}
        </div>
        {/* Last 3 sessions */}
        {allLogs.filter(l=>l.exo===pickedEx.name).sort((a,b)=>frSort(b.date,a.date)).slice(0,3).map(l=>(
          <div key={l.date+l.exo} style={{borderTop:`1px solid ${T.border}`,marginTop:12,paddingTop:10}}>
            <div style={{fontSize:10,color:T.dim,fontFamily:"'IBM Plex Mono'",marginBottom:4,fontWeight:700,letterSpacing:.5}}>{l.date} · {l.volume.toFixed(0)} kg vol</div>
            <div style={{fontSize:12,fontFamily:"'IBM Plex Mono'",color:T.text,fontWeight:600}}>{l.series.map(s=>`${s.poids}×${s.reps}`).join("  ")}</div>
          </div>
        ))}
      </div>
      {/* Set objective */}
      <div style={{background:T.card,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:14,letterSpacing:3,color:T.dim,marginBottom:12}}>OBJECTIF DU JOUR</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
          {[{k:"objPoids",l:"POIDS"},{k:"objReps",l:"REPS"},{k:"objSeries",l:"SÉRIES"}].map(({k,l})=>(
            <div key={k}>
              <label style={T.lbl}>{l}</label>
              <input type="number" step={k==="objPoids"?"0.5":"1"} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={{...T.inp,textAlign:"center",fontSize:18,fontWeight:800,padding:"14px 4px"}}/>
            </div>
          ))}
        </div>
        {objVol>0&&<div style={{fontSize:13,color:T.dim,marginBottom:14,fontWeight:600}}>Volume cible : <strong style={{color:T.amber,fontFamily:"'IBM Plex Mono'"}}>{objVol.toFixed(0)} kg</strong></div>}
        <button onClick={confirmAdd} style={{...btn(tcc.bg),width:"100%",padding:"15px",fontSize:15,boxShadow:`0 4px 16px ${tcc.bg}55`}}>+ AJOUTER AU PLAN</button>
      </div>
    </div>
  );}

  // Main list — vertical cards (no horizontal scroll)
  return(
    <div>
      {confirm&&<ConfirmModal title={confirm.title} message={confirm.message} onConfirm={confirm.onConfirm} onClose={()=>setConfirm(null)}/>}
      {/* Day bar */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        {days.map(d=>(
          <button key={d} onClick={()=>setSel(d)} style={{background:sel===d?T.text:T.card,color:sel===d?T.bg:T.textDim,border:`1.5px solid ${sel===d?T.text:T.border}`,borderRadius:10,padding:"9px 14px",fontFamily:"'Bebas Neue'",fontSize:14,cursor:"pointer",letterSpacing:1.5,WebkitTapHighlightColor:"transparent"}}>
            {d.toUpperCase()}
          </button>
        ))}
        {availableDays.length>0&&(
          showAddDay?(
            <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
              {availableDays.map(d=>(
                <button key={d} onClick={()=>addDay(d)} style={{background:T.ghost,color:T.textDim,border:`1px dashed ${T.borderHi}`,borderRadius:10,padding:"9px 12px",fontFamily:"'Bebas Neue'",fontSize:13,cursor:"pointer",letterSpacing:1,WebkitTapHighlightColor:"transparent"}}>+ {d.toUpperCase()}</button>
              ))}
              <button onClick={()=>setShowAddDay(false)} style={ghostBtn({padding:"9px 12px",fontSize:12})}>✕</button>
            </div>
          ):(
            <button onClick={()=>setShowAddDay(true)} style={ghostBtn({padding:"9px 14px",fontSize:13,fontFamily:"'Bebas Neue'",letterSpacing:1.5,color:T.dim})}>+ JOUR</button>
          )
        )}
      </div>

      {!sel?(
        <div style={{textAlign:"center",padding:48,color:T.dim,fontSize:14}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:48,color:T.faint,marginBottom:8}}>—</div>
          Aucun jour planifié. Appuyez sur "+ Jour".
        </div>
      ):(
      <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,gap:8}}>
        <div style={{minWidth:0}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:24,color:T.text,letterSpacing:1,lineHeight:1}}>{sel.toUpperCase()}</div>
          <div style={{color:T.dim,fontSize:12,fontFamily:"'IBM Plex Mono'",marginTop:2,fontWeight:600}}>{currPlan.length} EXERCICE{currPlan.length>1?"S":""}</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setStep("addex")} style={btn(T.red,"#fff",{padding:"11px 16px",fontSize:13,boxShadow:`0 4px 12px ${T.red}44`})}>+ EXERCICE</button>
          <button onClick={()=>askRemoveDay(sel)} style={ghostBtn({padding:"11px 12px",fontSize:16,color:T.faint})}>🗑</button>
        </div>
      </div>

      {currPlan.length===0?(
        <div style={{textAlign:"center",padding:32,color:T.dim,fontSize:14}}>Aucun exercice. Appuyez sur "+ Exercice".</div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {currPlan.map((p,i)=>{
            const ex=exDB.find(e=>e.name===p.exo);
            const tcc=tc(ex?.type||"Push");
            const c=tcc.bg;
            const s=exStats[p.exo]||{lastPerf:"—",prPoids:0,prVol:0};
            const ov=realW(p.objPoids,ex,bw)*p.objReps*p.objSeries;
            if(editIdx===i) return(
              <div key={i} style={{background:T.cardHi,borderRadius:14,padding:14,border:`1px solid ${T.border}`,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:tcc.grad}}/>
                <div style={{fontWeight:800,fontSize:14,color:T.text,marginBottom:10,paddingLeft:6}}>{p.exo}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                  {[["objPoids","KG"],["objReps","REPS"],["objSeries","SÉRIES"]].map(([k,l])=>(
                    <div key={k}><label style={T.lbl}>{l}</label><input type="number" step={k==="objPoids"?"0.5":"1"} value={editForm[k]} onChange={e=>setEditForm(f=>({...f,[k]:e.target.value}))} style={{...T.inp,fontSize:16,fontWeight:800,textAlign:"center",padding:"12px 4px"}}/></div>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  <button onClick={()=>{set(sel,currPlan.map((px,j)=>j===i?{...px,objPoids:pf(editForm.objPoids),objReps:parseInt(editForm.objReps)||8,objSeries:parseInt(editForm.objSeries)||3}:px));setEditIdx(null);}} style={btn(T.green,"#fff",{padding:"12px",fontSize:14})}>✓ ENREGISTRER</button>
                  <button onClick={()=>setEditIdx(null)} style={ghostBtn({padding:"12px",fontSize:14})}>Annuler</button>
                </div>
              </div>
            );
            return(
              <div key={i} style={{background:T.card,borderRadius:14,padding:"12px 14px",border:`1px solid ${T.border}`,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:tcc.grad}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,paddingLeft:6}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:800,fontSize:14,color:T.text,letterSpacing:-.2}}>{p.exo}</div>
                    <div style={{fontSize:11,color:T.dim,marginTop:3,fontFamily:"'IBM Plex Mono'",fontWeight:600}}>{ex?.muscle?.toUpperCase()}</div>
                  </div>
                  <div style={{display:"flex",gap:2}}>
                    <button onClick={()=>{setEditIdx(i);setEditForm({...p});}} style={{background:T.ghost,border:"none",cursor:"pointer",color:T.dim,fontSize:14,padding:"7px 10px",borderRadius:8,WebkitTapHighlightColor:"transparent"}}>✏️</button>
                    <button onClick={()=>askRemoveExo(i,p.exo)} style={{background:T.ghost,border:"none",cursor:"pointer",color:T.faint,fontSize:18,padding:"7px 10px",borderRadius:8,WebkitTapHighlightColor:"transparent"}}>×</button>
                  </div>
                </div>
                {/* Stats row — 3 colonnes responsives, pas de scroll */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:10,paddingLeft:6}}>
                  <div style={{background:T.card2,borderRadius:8,padding:"7px 9px",border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:9,color:T.faint,fontFamily:"'IBM Plex Mono'",letterSpacing:1,fontWeight:700,marginBottom:2}}>OBJECTIF</div>
                    <div style={{fontSize:12,fontFamily:"'IBM Plex Mono'",color:c,fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.objPoids>0?`${p.objPoids}`:"PDC"}<span style={{color:T.dim}}>×{p.objReps}×{p.objSeries}</span></div>
                  </div>
                  <div style={{background:T.card2,borderRadius:8,padding:"7px 9px",border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:9,color:T.faint,fontFamily:"'IBM Plex Mono'",letterSpacing:1,fontWeight:700,marginBottom:2}}>PR POIDS</div>
                    <div style={{fontSize:12,fontFamily:"'IBM Plex Mono'",color:T.green,fontWeight:800}}>{s.prPoids>0?`${s.prPoids.toFixed(1)}kg`:"—"}</div>
                  </div>
                  <div style={{background:T.card2,borderRadius:8,padding:"7px 9px",border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:9,color:T.faint,fontFamily:"'IBM Plex Mono'",letterSpacing:1,fontWeight:700,marginBottom:2}}>OBJ. VOL</div>
                    <div style={{fontSize:12,fontFamily:"'IBM Plex Mono'",color:T.amber,fontWeight:800}}>{ov>0?`${ov.toFixed(0)}kg`:"—"}</div>
                  </div>
                </div>
                {s.lastPerf!=="—"&&<div style={{marginTop:8,paddingLeft:6,fontSize:11,color:T.dim,fontFamily:"'IBM Plex Mono'",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><span style={{color:T.faint,fontWeight:700,letterSpacing:.5}}>DERNIÈRE</span> {s.lastPerf}</div>}
              </div>
            );
          })}
        </div>
      )}
      </>
      )}
    </div>
  );
}

/* ─── STATS ──────────────────────────────────────────────────────────────── */
function StatCard({label, value, accent, sub}) {
  return(
    <div style={{background:T.card,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:accent}}/>
      <div style={{fontSize:10,color:T.faint,fontFamily:"'IBM Plex Mono'",letterSpacing:1.5,marginBottom:6,fontWeight:700,paddingLeft:4}}>{label}</div>
      <div style={{fontFamily:"'Bebas Neue'",fontSize:32,color:T.text,letterSpacing:1,lineHeight:1,paddingLeft:4}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:T.dim,fontFamily:"'IBM Plex Mono'",marginTop:4,fontWeight:600,paddingLeft:4}}>{sub}</div>}
    </div>
  );
}

function Stats({logs, exDB}) {
  const [fExo,setFExo]=useState("Tous");
  const [fMuscle,setFMuscle]=useState("Tous");
  const [fType,setFType]=useState("Tous");
  const [period,setPeriod]=useState("all"); // all | 30 | 90
  const [tooltip,setTooltip]=useState(null);

  const allExos=["Tous",...new Set(logs.map(l=>l.exo))].sort();
  const allMuscles=["Tous",...MUSCLE_GROUPS.filter(m=>logs.some(l=>l.muscle===m))];

  const periodFiltered=useMemo(()=>{
    if(period==="all") return logs;
    const days=parseInt(period);
    const cutoff=new Date();cutoff.setDate(cutoff.getDate()-days);
    return logs.filter(l=>{const [d,m,y]=l.date.split("/").map(Number);return new Date(y,m-1,d)>=cutoff;});
  },[logs,period]);

  const filtered=useMemo(()=>periodFiltered.filter(l=>{
    if(fExo!=="Tous"&&l.exo!==fExo)return false;
    if(fMuscle!=="Tous"&&l.muscle!==fMuscle)return false;
    const ex=exDB.find(e=>e.name===l.exo);
    if(fType!=="Tous"&&ex?.type!==fType)return false;
    return true;
  }),[periodFiltered,fExo,fMuscle,fType,exDB]);

  const byDate=useMemo(()=>{
    const m={};filtered.forEach(l=>{m[l.date]=(m[l.date]||0)+(l.volume||0);});
    return Object.entries(m).sort((a,b)=>frSort(a[0],b[0]));
  },[filtered]);

  const totalVol=filtered.reduce((a,l)=>a+(l.volume||0),0);
  const sessionDates=[...new Set(filtered.map(l=>l.date))];
  const nSess=sessionDates.length;
  const totalReps=filtered.reduce((a,l)=>a+l.series.reduce((b,s)=>b+pf(s.reps),0),0);
  const totalSeries=filtered.reduce((a,l)=>a+l.series.length,0);

  // Streak: consecutive weeks with at least one session
  const weekStreak=useMemo(()=>{
    if(sessionDates.length===0)return 0;
    const weekKey=ds=>{const [d,m,y]=ds.split("/").map(Number);const dt=new Date(y,m-1,d);const onejan=new Date(dt.getFullYear(),0,1);const w=Math.ceil(((dt-onejan)/86400000+onejan.getDay()+1)/7);return `${dt.getFullYear()}-${w}`;};
    const weeks=new Set(sessionDates.map(weekKey));
    let cur=new Date(),streak=0;
    while(true){
      const onejan=new Date(cur.getFullYear(),0,1);
      const w=Math.ceil(((cur-onejan)/86400000+onejan.getDay()+1)/7);
      const k=`${cur.getFullYear()}-${w}`;
      if(weeks.has(k)){streak++;cur.setDate(cur.getDate()-7);}
      else if(streak===0){cur.setDate(cur.getDate()-7);if(streak===0&&cur<new Date(2020,0,1))break;continue;}
      else break;
    }
    return streak;
  },[sessionDates]);

  const prPerExo=useMemo(()=>{
    const m={};
    filtered.forEach(l=>{const ex=exDB.find(e=>e.name===l.exo);l.series.forEach(s=>{const rw=realW(s.poids,ex,0);if(!m[l.exo]||rw>m[l.exo].poids)m[l.exo]={poids:rw,reps:pf(s.reps),date:l.date,type:l.type};});});
    return Object.entries(m).sort((a,b)=>b[1].poids-a[1].poids);
  },[filtered,exDB]);

  const volByExo=useMemo(()=>{const m={};filtered.forEach(l=>{m[l.exo]=(m[l.exo]||0)+(l.volume||0);});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[filtered]);
  const volByMuscle=useMemo(()=>{const m={};filtered.forEach(l=>{m[l.muscle]=(m[l.muscle]||0)+(l.volume||0);});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[filtered]);
  const volByType=useMemo(()=>{const m={Push:0,Pull:0,Legs:0,Gainage:0};filtered.forEach(l=>{const ex=exDB.find(e=>e.name===l.exo);const t=ex?.type||"Push";m[t]=(m[t]||0)+(l.volume||0);});return Object.entries(m);},[filtered,exDB]);

  // Sessions by weekday
  const sessionsByDow=useMemo(()=>{
    const m={Lundi:0,Mardi:0,Mercredi:0,Jeudi:0,Vendredi:0,Samedi:0,Dimanche:0};
    sessionDates.forEach(d=>{m[dowOf(d)]=(m[dowOf(d)]||0)+1;});
    return DAYS_OF_WEEK.map(d=>[d,m[d]||0]);
  },[sessionDates]);

  // Progression of top exos (top 3 by frequency)
  const topExos=useMemo(()=>{
    const counts={};filtered.forEach(l=>{counts[l.exo]=(counts[l.exo]||0)+1;});
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([exo])=>{
      const series=filtered.filter(l=>l.exo===exo).sort((a,b)=>frSort(a.date,b.date));
      const points=series.map(l=>{const ex=exDB.find(e=>e.name===l.exo);return {date:l.date,max:l.series.reduce((mx,s)=>{const rw=realW(s.poids,ex,0);return rw>mx?rw:mx;},0)};});
      const ex=exDB.find(e=>e.name===exo);
      return {exo,type:ex?.type||"Push",points};
    });
  },[filtered,exDB]);

  const chartData=byDate.slice(-25);
  const chartMax=Math.max(...chartData.map(d=>d[1]),1);
  const chartMin=Math.min(...chartData.map(d=>d[1]),0);

  // Main volume chart (responsive via viewBox)
  const W=440,H=110,P=12;
  const pts=chartData.map((d,i)=>({x:P+(i/(Math.max(chartData.length-1,1)))*(W-P*2),y:H-P-((d[1]-chartMin)/Math.max(chartMax-chartMin,1))*(H-P*2),date:d[0],vol:d[1]}));
  const path=pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const maxDow=Math.max(...sessionsByDow.map(d=>d[1]),1);
  const totalVolByType=volByType.reduce((a,b)=>a+b[1],0)||1;

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Period switcher */}
      <div style={{display:"flex",gap:6,background:T.card,borderRadius:12,padding:5,border:`1px solid ${T.border}`}}>
        {[["all","TOUT"],["90","90 J"],["30","30 J"]].map(([k,l])=>(
          <button key={k} onClick={()=>setPeriod(k)} style={{flex:1,background:period===k?T.text:"transparent",color:period===k?T.bg:T.dim,border:"none",borderRadius:8,padding:"10px",fontFamily:"'Bebas Neue'",fontSize:14,letterSpacing:1.5,cursor:"pointer",fontWeight:400,WebkitTapHighlightColor:"transparent"}}>{l}</button>
        ))}
      </div>

      {/* Filters */}
      <div style={{background:T.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${T.border}`}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[
            {l:"TYPE",v:fType,s:setFType,opts:["Tous","Push","Pull","Legs","Gainage"]},
            {l:"MUSCLE",v:fMuscle,s:setFMuscle,opts:allMuscles},
            {l:"EXERCICE",v:fExo,s:setFExo,opts:allExos},
          ].map(({l,v,s,opts})=>(
            <div key={l} style={{minWidth:0}}>
              <label style={T.lbl}>{l}</label>
              <select value={v} onChange={e=>s(e.target.value)} style={{...T.inp,fontSize:12,padding:"10px 8px",cursor:"pointer"}}>
                {opts.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        {(fExo!=="Tous"||fMuscle!=="Tous"||fType!=="Tous")&&
          <button onClick={()=>{setFExo("Tous");setFMuscle("Tous");setFType("Tous");}} style={{...ghostBtn({padding:"8px 12px",fontSize:12,marginTop:8})}}>✕ Réinitialiser</button>}
      </div>

      {/* Hero KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <StatCard label="SÉANCES" value={nSess} accent={T.text} sub={weekStreak>0?`Série de ${weekStreak} sem.`:""}/>
        <StatCard label="VOLUME TOTAL" value={`${(totalVol/1000).toFixed(1)}t`} accent={T.green} sub={nSess>0?`${(totalVol/nSess/1000).toFixed(1)}t / séance`:""}/>
        <StatCard label="SÉRIES" value={totalSeries} accent={T.amber} sub={`${totalReps} reps total`}/>
        <StatCard label="RECORDS" value={prPerExo.length} accent={T.purple} sub="Exercices PR"/>
      </div>

      {/* Volume chart */}
      {chartData.length>=2&&(
        <div style={{background:T.card,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:14,letterSpacing:2.5,color:T.dim,marginBottom:12}}>VOLUME PAR SÉANCE</div>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:"100%",height:H,display:"block",overflow:"visible"}}
            onMouseLeave={()=>setTooltip(null)}>
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.red} stopOpacity=".35"/>
                <stop offset="100%" stopColor={T.red} stopOpacity="0"/>
              </linearGradient>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fbbf24"/>
                <stop offset="50%" stopColor={T.red}/>
                <stop offset="100%" stopColor="#a855f7"/>
              </linearGradient>
            </defs>
            <path d={`${path} L${pts[pts.length-1].x},${H-P} L${pts[0].x},${H-P} Z`} fill="url(#sg)"/>
            <path d={path} stroke="url(#lg)" strokeWidth="2.2" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
            {pts.map((p,i)=>(
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={16} fill="transparent" onMouseEnter={()=>setTooltip({x:p.x,y:p.y,date:p.date,vol:p.vol})} onTouchStart={()=>setTooltip({x:p.x,y:p.y,date:p.date,vol:p.vol})}/>
                <circle cx={p.x} cy={p.y} r={tooltip?.date===p.date?5:3} fill={tooltip?.date===p.date?T.text:T.red} stroke={T.bg} strokeWidth={1.5}/>
              </g>
            ))}
            {tooltip&&(()=>{
              const tx=Math.min(Math.max(tooltip.x-55,0),W-130);
              return(
                <g>
                  <rect x={tx} y={Math.max(tooltip.y-50,2)} width={130} height={42} rx={8} fill={T.cardHi} stroke={T.borderHi} strokeWidth={1}/>
                  <text x={tx+10} y={Math.max(tooltip.y-32,18)} fill={T.dim} style={{fontSize:9,fontFamily:"'IBM Plex Mono'",fontWeight:700,letterSpacing:.5}}>{tooltip.date}</text>
                  <text x={tx+10} y={Math.max(tooltip.y-15,33)} fill={T.text} style={{fontSize:13,fontFamily:"'IBM Plex Mono'",fontWeight:800}}>{tooltip.vol.toFixed(0)} kg</text>
                </g>
              );
            })()}
          </svg>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:T.faint,fontFamily:"'IBM Plex Mono'",fontWeight:700}}><span>{chartData[0][0]}</span><span>{chartData[chartData.length-1][0]}</span></div>
        </div>
      )}

      {/* Frequency by weekday */}
      {nSess>0&&(
        <div style={{background:T.card,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:14,letterSpacing:2.5,color:T.dim,marginBottom:14}}>FRÉQUENCE PAR JOUR</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,alignItems:"flex-end",height:90}}>
            {sessionsByDow.map(([d,n])=>{
              const h=n>0?Math.max((n/maxDow)*70,8):3;
              const isMax=n>0&&n===maxDow;
              return(
                <div key={d} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,height:"100%",justifyContent:"flex-end"}}>
                  <div style={{fontSize:11,fontFamily:"'IBM Plex Mono'",color:n>0?T.text:T.faint,fontWeight:800}}>{n||"·"}</div>
                  <div style={{width:"100%",maxWidth:30,height:h,background:n>0?(isMax?"linear-gradient(180deg,#ef4444,#dc2626)":T.borderHi):T.ghost,borderRadius:6,transition:"height .3s"}}/>
                </div>
              );
            })}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,marginTop:6}}>
            {DAYS_OF_WEEK.map(d=>(
              <div key={d} style={{textAlign:"center",fontSize:10,color:T.faint,fontFamily:"'IBM Plex Mono'",letterSpacing:.5,fontWeight:700}}>{d.slice(0,3).toUpperCase()}</div>
            ))}
          </div>
        </div>
      )}

      {/* Type balance */}
      {totalVolByType>1&&(
        <div style={{background:T.card,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:14,letterSpacing:2.5,color:T.dim,marginBottom:14}}>RÉPARTITION PAR TYPE</div>
          <div style={{display:"flex",height:14,borderRadius:7,overflow:"hidden",marginBottom:12,background:T.ghost}}>
            {volByType.filter(([,v])=>v>0).map(([t,v])=>{
              const pct=(v/totalVolByType)*100;
              return <div key={t} title={`${t}: ${v.toFixed(0)} kg`} style={{width:`${pct}%`,background:tc(t).grad,transition:"width .3s"}}/>;
            })}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
            {volByType.map(([t,v])=>{
              const tcc=tc(t);
              const pct=(v/totalVolByType)*100;
              return(
                <div key={t} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <div style={{width:10,height:10,borderRadius:3,background:tcc.bg}}/>
                    <span style={{color:T.textDim,fontWeight:600}}>{tcc.label}</span>
                  </div>
                  <span style={{fontFamily:"'IBM Plex Mono'",color:tcc.bg,fontWeight:800,fontSize:12}}>{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Volume by muscle */}
      {volByMuscle.length>0&&(
        <div style={{background:T.card,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:14,letterSpacing:2.5,color:T.dim,marginBottom:14}}>VOLUME PAR MUSCLE</div>
          {volByMuscle.slice(0,10).map(([muscle,vol])=>{
            const ex=exDB.find(e=>e.muscle===muscle);
            const tcc=tc(ex?.type||"Push");
            const mx=volByMuscle[0][1];
            const pct=(vol/mx)*100;
            return(
              <div key={muscle} style={{marginBottom:11}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:13}}>
                  <span style={{color:T.textDim,fontWeight:600}}>{muscle}</span>
                  <span style={{fontFamily:"'IBM Plex Mono'",color:tcc.bg,fontSize:12,fontWeight:800}}>{vol>=1000?`${(vol/1000).toFixed(1)}t`:`${vol.toFixed(0)}kg`}</span>
                </div>
                <div style={{height:6,background:T.ghost,borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:`${pct}%`,height:"100%",background:tcc.grad,borderRadius:3,transition:"width .4s"}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Top exo progression */}
      {topExos.length>0&&topExos.some(t=>t.points.length>=2)&&(
        <div style={{background:T.card,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:14,letterSpacing:2.5,color:T.dim,marginBottom:14}}>PROGRESSION (TOP 3)</div>
          {topExos.filter(t=>t.points.length>=2).map(({exo,type,points})=>{
            const tcc=tc(type);
            const max=Math.max(...points.map(p=>p.max),1);
            const min=Math.min(...points.map(p=>p.max),0);
            const PW=400,PH=50,PP=4;
            const ppts=points.map((p,i)=>({x:PP+(i/(Math.max(points.length-1,1)))*(PW-PP*2),y:PH-PP-((p.max-min)/Math.max(max-min,1))*(PH-PP*2)}));
            const pPath=ppts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
            const first=points[0].max,last=points[points.length-1].max;
            const delta=last-first;
            return(
              <div key={exo} style={{marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${T.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{fontSize:13,color:T.text,fontWeight:700,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:8}}>{exo}</div>
                  <div style={{fontSize:12,fontFamily:"'IBM Plex Mono'",color:delta>=0?T.green:T.red,fontWeight:800,whiteSpace:"nowrap"}}>{delta>=0?"+":""}{delta.toFixed(1)}kg</div>
                </div>
                <svg viewBox={`0 0 ${PW} ${PH}`} preserveAspectRatio="none" style={{width:"100%",height:PH,display:"block"}}>
                  <path d={pPath} stroke={tcc.bg} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
                  {ppts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={2} fill={tcc.bg}/>)}
                </svg>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.faint,fontFamily:"'IBM Plex Mono'",fontWeight:700,marginTop:3}}>
                  <span>{first.toFixed(1)}kg · {points[0].date}</span>
                  <span>{last.toFixed(1)}kg · {points[points.length-1].date}</span>
                </div>
              </div>
            );
          }).slice(0,3)}
        </div>
      )}

      {/* PRs */}
      {prPerExo.length>0&&(
        <div style={{background:T.card,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:14,letterSpacing:2.5,color:T.dim,marginBottom:12}}>RECORDS PERSONNELS</div>
          {prPerExo.slice(0,12).map(([exo,pr],i)=>{
            const tcc=tc(pr.type);
            return(
              <div key={exo} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:i===Math.min(prPerExo.length,12)-1?"none":`1px solid ${T.border}`,gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:9,minWidth:0,flex:1}}>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:14,color:T.faint,letterSpacing:.5,minWidth:18}}>{i+1}</div>
                  <div style={{width:6,height:6,borderRadius:3,background:tcc.bg,flexShrink:0}}/>
                  <div style={{fontSize:13,color:T.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:600}}>{exo}</div>
                </div>
                <div style={{fontFamily:"'IBM Plex Mono'",color:T.green,fontWeight:800,fontSize:12,whiteSpace:"nowrap"}}>{pr.poids.toFixed(1)}<span style={{color:T.dim,fontWeight:500}}>kg</span> × {pr.reps}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Volume by exo */}
      {volByExo.length>0&&(
        <div style={{background:T.card,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:14,letterSpacing:2.5,color:T.dim,marginBottom:14}}>VOLUME CUMULÉ — EXERCICES</div>
          {volByExo.slice(0,12).map(([exo,vol])=>{
            const ex=exDB.find(e=>e.name===exo);
            const tcc=tc(ex?.type||"Push");
            const mx=volByExo[0][1];
            return(
              <div key={exo} style={{marginBottom:9}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12,gap:8}}>
                  <span style={{color:T.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:600}}>{exo}</span>
                  <span style={{fontFamily:"'IBM Plex Mono'",color:tcc.bg,fontSize:11,fontWeight:800,whiteSpace:"nowrap"}}>{vol>=1000?`${(vol/1000).toFixed(1)}t`:`${vol.toFixed(0)}kg`}</span>
                </div>
                <div style={{height:5,background:T.ghost,borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:`${(vol/mx)*100}%`,height:"100%",background:tcc.grad,borderRadius:3}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length===0&&(
        <div style={{textAlign:"center",padding:48,color:T.dim,fontSize:14}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:48,color:T.faint,marginBottom:8}}>—</div>
          Aucune donnée pour ces filtres.
        </div>
      )}
    </div>
  );
}

/* ─── LOG EDITOR MODAL ───────────────────────────────────────────────────── */
function LogEditor({log, exDB, onSave, onDelete, onClose, bw}) {
  const ex = exDB.find(e=>e.name===log.exo);
  const tcol = tc(ex?.type||"Push");
  const [series,setSeries]=useState(log.series.map(s=>({poids:String(s.poids),reps:String(s.reps)})));
  const [note,setNote]=useState(log.note||"");
  const [confirmDel,setConfirmDel]=useState(false);
  const upd=(i,f,v)=>setSeries(p=>p.map((s,j)=>j===i?{...s,[f]:v}:s));
  const save=()=>{
    const filled=series.filter(s=>s.reps!==""||s.poids!=="");
    const newVol=calcVol(filled,ex,bw);
    onSave({...log,series:filled.map(s=>({poids:pf(s.poids),reps:pf(s.reps)})),volume:newVol,note});
    onClose();
  };
  return(
    <>
    {confirmDel&&<ConfirmModal title="Supprimer ce log ?" message={`"${log.exo}" du ${log.date} sera définitivement supprimé.`} onConfirm={()=>{onDelete(log);onClose();}} onClose={()=>setConfirmDel(false)}/>}
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"#000c",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(4px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:"20px 20px 0 0",padding:"20px 16px calc(20px + env(safe-area-inset-bottom, 0px))",width:"100%",maxWidth:600,maxHeight:"86vh",overflowY:"auto",border:`1px solid ${T.border}`,borderBottom:"none"}}>
        <div style={{height:4,width:40,background:T.borderHi,borderRadius:2,margin:"0 auto 16px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,gap:10}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <span style={{fontSize:10,background:tcol.soft,color:tcol.bg,borderRadius:6,padding:"3px 8px",fontFamily:"'IBM Plex Mono'",fontWeight:800,letterSpacing:.5}}>{ex?.type?.toUpperCase()}</span>
            </div>
            <div style={{fontWeight:900,fontSize:18,color:T.text,letterSpacing:-.3,lineHeight:1.2}}>{log.exo}</div>
            <div style={{fontSize:12,color:T.dim,fontFamily:"'IBM Plex Mono'",marginTop:4,fontWeight:600}}>{log.date}</div>
          </div>
          <button onClick={onClose} style={{background:T.ghost,border:"none",color:T.dim,fontSize:18,cursor:"pointer",borderRadius:10,padding:"8px 11px",WebkitTapHighlightColor:"transparent"}}>✕</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"24px 1fr 1fr 36px",gap:8,marginBottom:6,padding:"0 2px"}}>
          <div/><div style={{...T.lbl,textAlign:"center",marginBottom:0}}>KG</div><div style={{...T.lbl,textAlign:"center",marginBottom:0}}>REPS</div><div/>
        </div>
        {series.map((s,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"24px 1fr 1fr 36px",gap:8,marginBottom:9,alignItems:"center"}}>
            <div style={{fontSize:13,color:T.faint,textAlign:"center",fontFamily:"'Bebas Neue'",letterSpacing:1}}>{i+1}</div>
            <input type="number" step="0.5" value={s.poids} onChange={e=>upd(i,"poids",e.target.value)} style={{...T.inp,textAlign:"center",fontSize:20,fontWeight:900,padding:"13px 4px"}}/>
            <input type="number" value={s.reps} onChange={e=>upd(i,"reps",e.target.value)} style={{...T.inp,textAlign:"center",fontSize:20,fontWeight:900,padding:"13px 4px"}}/>
            <button onClick={()=>setSeries(p=>p.filter((_,j)=>j!==i))} style={{background:"transparent",border:"none",cursor:"pointer",color:T.faint,fontSize:22,WebkitTapHighlightColor:"transparent"}}>×</button>
          </div>
        ))}
        <button onClick={()=>setSeries(p=>[...p,{poids:p[p.length-1]?.poids||"",reps:""}])} style={{background:"transparent",border:`1.5px dashed ${T.border}`,borderRadius:12,color:T.dim,fontSize:13,cursor:"pointer",padding:"11px",width:"100%",marginBottom:14,fontWeight:600,fontFamily:"'Inter',sans-serif",WebkitTapHighlightColor:"transparent"}}>+ Ajouter une série</button>
        <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Remarque…" style={{...T.inp,marginBottom:14}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <button onClick={save} style={btn(T.green,"#fff",{padding:"14px",fontSize:14,boxShadow:`0 4px 12px ${T.green}55`})}>✓ Enregistrer</button>
          <button onClick={onClose} style={ghostBtn({padding:"14px",fontSize:14})}>Annuler</button>
        </div>
        {onDelete&&<button onClick={()=>setConfirmDel(true)} style={{...ghostBtn({padding:"12px",fontSize:13,width:"100%",color:T.red,borderColor:T.red+"55"})}}>🗑 Supprimer ce log</button>}
      </div>
    </div>
    </>
  );
}

/* ─── LOG ADD MODAL — ajouter un log à une date précise ──────────────────── */
function LogAddModal({defaultDate, exDB, onSave, onClose, bw}) {
  const [step,setStep]=useState("pick"); // pick | form
  const [date,setDate]=useState(defaultDate||todayFR());
  const [search,setSearch]=useState("");
  const [muscleFilter,setMuscleFilter]=useState("Tous");
  const [pickedEx,setPickedEx]=useState(null);
  const [series,setSeries]=useState([{poids:"",reps:""},{poids:"",reps:""},{poids:"",reps:""}]);
  const [note,setNote]=useState("");

  const muscles=["Tous",...MUSCLE_GROUPS.filter(m=>exDB.some(e=>e.muscle===m))];
  const filteredEx=exDB.filter(e=>{
    if(muscleFilter!=="Tous"&&e.muscle!==muscleFilter)return false;
    if(search&&!e.name.toLowerCase().includes(search.toLowerCase())&&!e.muscle.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  const upd=(i,f,v)=>setSeries(p=>p.map((s,j)=>j===i?{...s,[f]:v}:s));
  const submit=()=>{
    if(!pickedEx)return;
    if(!/^\d{2}\/\d{2}\/\d{4}$/.test(date.trim()))return;
    const filled=series.filter(s=>s.reps!==""||s.poids!=="").map(s=>({poids:pf(s.poids),reps:pf(s.reps)}));
    if(!filled.length)return;
    onSave({date:date.trim(),exo:pickedEx.name,muscle:pickedEx.muscle,type:pickedEx.type,series:filled,volume:calcVol(filled,pickedEx,bw),note,mult:pickedEx.mult,barAdd:pickedEx.barAdd,useBodyweight:pickedEx.useBodyweight||false,ts:Date.now()});
    onClose();
  };

  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"#000c",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(4px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:"20px 20px 0 0",padding:"20px 16px calc(20px + env(safe-area-inset-bottom, 0px))",width:"100%",maxWidth:600,maxHeight:"86vh",overflowY:"auto",border:`1px solid ${T.border}`,borderBottom:"none"}}>
        <div style={{height:4,width:40,background:T.borderHi,borderRadius:2,margin:"0 auto 16px"}}/>
        {step==="pick"?(
          <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontWeight:900,fontSize:18,color:T.text,letterSpacing:-.3}}>Ajouter un log</div>
            <button onClick={onClose} style={{background:T.ghost,border:"none",color:T.dim,fontSize:18,cursor:"pointer",borderRadius:10,padding:"8px 11px"}}>✕</button>
          </div>
          <div style={{marginBottom:12}}>
            <label style={T.lbl}>DATE (JJ/MM/AAAA)</label>
            <input value={date} onChange={e=>setDate(e.target.value)} placeholder="JJ/MM/AAAA" style={{...T.inp,fontFamily:"'IBM Plex Mono'",fontSize:15}}/>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un exercice…" style={{...T.inp,marginBottom:10,fontSize:14}}/>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
            {muscles.map(m=><button key={m} onClick={()=>setMuscleFilter(m)} style={{background:muscleFilter===m?T.text:T.ghost,color:muscleFilter===m?T.bg:T.textDim,border:"none",borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer",fontFamily:"'IBM Plex Mono'",fontWeight:800,letterSpacing:.5}}>{m.toUpperCase()}</button>)}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:340,overflowY:"auto"}}>
            {filteredEx.map(ex=>{
              const tcc=tc(ex.type);
              return(
                <button key={ex.name} onClick={()=>setPickedEx(ex)||setStep("form")} style={{background:T.cardHi,border:`1px solid ${pickedEx?.name===ex.name?tcc.bg:T.border}`,borderRadius:10,padding:"10px 12px",cursor:"pointer",textAlign:"left",position:"relative",overflow:"hidden",WebkitTapHighlightColor:"transparent",fontFamily:"'Inter',sans-serif"}}>
                  <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:tcc.grad}}/>
                  <div style={{paddingLeft:6}}>
                    <div style={{fontWeight:700,fontSize:13,color:T.text}}>{ex.name}</div>
                    <div style={{fontSize:11,color:T.dim,marginTop:2,fontWeight:500}}>{ex.muscle}</div>
                  </div>
                </button>
              );
            })}
          </div>
          </>
        ):(
          <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,gap:10}}>
            <div style={{flex:1,minWidth:0}}>
              <button onClick={()=>setStep("pick")} style={{...ghostBtn({padding:"6px 10px",fontSize:12,marginBottom:8})}}>← Changer</button>
              <div style={{fontWeight:900,fontSize:17,color:T.text,letterSpacing:-.2}}>{pickedEx.name}</div>
              <div style={{fontSize:12,color:T.dim,fontFamily:"'IBM Plex Mono'",marginTop:3,fontWeight:600}}>{date}</div>
            </div>
            <button onClick={onClose} style={{background:T.ghost,border:"none",color:T.dim,fontSize:18,cursor:"pointer",borderRadius:10,padding:"8px 11px"}}>✕</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"24px 1fr 1fr 36px",gap:8,marginBottom:6}}>
            <div/><div style={{...T.lbl,textAlign:"center",marginBottom:0}}>KG</div><div style={{...T.lbl,textAlign:"center",marginBottom:0}}>REPS</div><div/>
          </div>
          {series.map((s,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"24px 1fr 1fr 36px",gap:8,marginBottom:9,alignItems:"center"}}>
              <div style={{fontSize:13,color:T.faint,textAlign:"center",fontFamily:"'Bebas Neue'",letterSpacing:1}}>{i+1}</div>
              <input type="number" step="0.5" value={s.poids} onChange={e=>upd(i,"poids",e.target.value)} style={{...T.inp,textAlign:"center",fontSize:20,fontWeight:900,padding:"13px 4px"}}/>
              <input type="number" value={s.reps} onChange={e=>upd(i,"reps",e.target.value)} style={{...T.inp,textAlign:"center",fontSize:20,fontWeight:900,padding:"13px 4px"}}/>
              <button onClick={()=>setSeries(p=>p.filter((_,j)=>j!==i))} style={{background:"transparent",border:"none",cursor:"pointer",color:T.faint,fontSize:22}}>×</button>
            </div>
          ))}
          <button onClick={()=>setSeries(p=>[...p,{poids:p[p.length-1]?.poids||"",reps:""}])} style={{background:"transparent",border:`1.5px dashed ${T.border}`,borderRadius:12,color:T.dim,fontSize:13,cursor:"pointer",padding:"11px",width:"100%",marginBottom:14,fontWeight:600,fontFamily:"'Inter',sans-serif"}}>+ Ajouter une série</button>
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Remarque…" style={{...T.inp,marginBottom:14}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <button onClick={submit} style={btn(T.green,"#fff",{padding:"14px",fontSize:14,boxShadow:`0 4px 12px ${T.green}55`})}>✓ Ajouter</button>
            <button onClick={onClose} style={ghostBtn({padding:"14px",fontSize:14})}>Annuler</button>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── EX MODAL ───────────────────────────────────────────────────────────── */
function ExModal({initial, onSave, onDelete, onClose}) {
  const [f,setF]=useState(initial||{name:"",muscle:"Pectoraux",type:"Push",mult:1,barAdd:0,useBodyweight:false});
  const [confirmDel,setConfirmDel]=useState(false);
  return(
    <>
    {confirmDel&&onDelete&&<ConfirmModal title="Supprimer cet exercice ?" message={`"${initial?.name}" sera retiré de la base. Les logs existants ne seront pas affectés.`} onConfirm={()=>{onDelete();onClose();}} onClose={()=>setConfirmDel(false)}/>}
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"#000c",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(4px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:"20px 20px 0 0",padding:"20px 16px calc(20px + env(safe-area-inset-bottom, 0px))",width:"100%",maxWidth:500,border:`1px solid ${T.border}`,borderBottom:"none"}}>
        <div style={{height:4,width:40,background:T.borderHi,borderRadius:2,margin:"0 auto 16px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontWeight:900,fontSize:18,color:T.text,letterSpacing:-.3}}>{initial?"Modifier l'exercice":"Nouvel exercice"}</div>
          <button onClick={onClose} style={{background:T.ghost,border:"none",color:T.dim,fontSize:18,cursor:"pointer",borderRadius:10,padding:"8px 11px"}}>✕</button>
        </div>
        <div style={{marginBottom:12}}><label style={T.lbl}>NOM</label><input value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} style={T.inp} autoFocus/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div><label style={T.lbl}>MUSCLE</label><select value={f.muscle} onChange={e=>setF(p=>({...p,muscle:e.target.value}))} style={{...T.inp,cursor:"pointer"}}>{MUSCLE_GROUPS.map(m=><option key={m}>{m}</option>)}</select></div>
          <div><label style={T.lbl}>TYPE</label><select value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))} style={{...T.inp,cursor:"pointer"}}>{["Push","Pull","Legs","Gainage"].map(t=><option key={t}>{t}</option>)}</select></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div><label style={T.lbl}>MULTIPLICATEUR</label><select value={f.mult} onChange={e=>setF(p=>({...p,mult:Number(e.target.value)}))} style={{...T.inp,cursor:"pointer"}}><option value={1}>×1 — 1 côté</option><option value={2}>×2 — 2 bras</option></select></div>
          <div><label style={T.lbl}>+ BARRE (KG)</label><input type="number" value={f.barAdd} onChange={e=>setF(p=>({...p,barAdd:Number(e.target.value)}))} style={T.inp}/></div>
        </div>
        <label style={{display:"flex",alignItems:"center",gap:10,marginBottom:18,cursor:"pointer",fontSize:14,color:T.textDim,padding:"10px 12px",background:T.cardHi,borderRadius:10,border:`1px solid ${T.border}`,fontWeight:600}}>
          <input type="checkbox" checked={f.useBodyweight} onChange={e=>setF(p=>({...p,useBodyweight:e.target.checked}))} style={{width:18,height:18,accentColor:T.red}}/>
          Au poids du corps (PDC)
        </label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:initial&&onDelete?8:0}}>
          <button onClick={()=>{if(f.name.trim()){onSave(f);onClose();}}} style={btn(T.green,"#fff",{padding:"14px",fontSize:14,boxShadow:`0 4px 12px ${T.green}55`})}>✓ Enregistrer</button>
          <button onClick={onClose} style={ghostBtn({padding:"14px",fontSize:14})}>Annuler</button>
        </div>
        {initial&&onDelete&&<button onClick={()=>setConfirmDel(true)} style={{...ghostBtn({padding:"12px",fontSize:13,width:"100%",color:T.red,borderColor:T.red+"55"})}}>🗑 Supprimer cet exercice</button>}
      </div>
    </div>
    </>
  );
}

/* ─── MAIN APP ───────────────────────────────────────────────────────────── */
export default function App() {
  const [tab,setTab]=useState("seance");
  const [timer,setTimer]=useState(false);
  const [exModal,setExModal]=useState(null);
  const [logEdit,setLogEdit]=useState(null);
  const [logAdd,setLogAdd]=useState(null); // null | {defaultDate?}
  const [confirm,setConfirm]=useState(null);
  const [exDB,setExDB]=useState(INIT_EX);
  const [weekPlan,setWeekPlan]=useState(INIT_WEEK_PLAN);
  const [logs,setLogs]=useState(INIT_LOGS);
  const [logSearch,setLogSearch]=useState("");
  const [logDate,setLogDate]=useState("Tous");
  const [exSearch,setExSearch]=useState("");
  const [bw,setBw]=useState(80);
  const [showBwEdit,setShowBwEdit]=useState(false);
  const [bwInput,setBwInput]=useState("80");
  const [loaded,setLoaded]=useState(false);
  const [saveStatus,setSaveStatus]=useState(null);
  const saveTimer=useRef(null);
  const lastPullAt=useRef(0);

  const reloadFromStorage=useCallback(async()=>{
    lastPullAt.current=Date.now();
    try {
      const data = await loadData();
      if(data) {
        if(data.logs)     setLogs(data.logs);
        if(data.weekPlan) setWeekPlan(data.weekPlan);
        else if(data.plans) {
          const migrated={};
          Object.entries(data.plans).forEach(([date,exos])=>{const day=dowOf(date);if(!migrated[day])migrated[day]=exos;});
          if(Object.keys(migrated).length>0) setWeekPlan(migrated);
        }
        if(data.exDB)  setExDB(data.exDB);
        if(data.bw!=null) { setBw(data.bw); setBwInput(String(data.bw)); }
      }
    } catch(e){ console.error("Load error",e); }
  },[]);

  // ── LOAD from storage on mount ──────────────────────────────────────────
  useEffect(()=>{
    (async()=>{
      await reloadFromStorage();
      setLoaded(true);
    })();
  },[reloadFromStorage]);

  // ── AUTO-PULL when the app regains focus or visibility ─────────────────
  useEffect(()=>{
    if(!loaded) return;
    const onActive=()=>{
      if(document.visibilityState!=="visible") return;
      if(Date.now()-lastPullAt.current<5000) return;
      reloadFromStorage();
    };
    document.addEventListener("visibilitychange",onActive);
    window.addEventListener("focus",onActive);
    return ()=>{
      document.removeEventListener("visibilitychange",onActive);
      window.removeEventListener("focus",onActive);
    };
  },[loaded,reloadFromStorage]);

  // ── SAVE whenever data changes (debounced 800ms) ─────────────────────────
  useEffect(()=>{
    if(!loaded) return;
    clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current=setTimeout(async()=>{
      try {
        await saveData({ logs, weekPlan, exDB, bw });
        setSaveStatus("saved");
        setTimeout(()=>setSaveStatus(null),2000);
      } catch(e){ setSaveStatus("error"); console.error("Save error",e); }
    },800);
    return ()=>clearTimeout(saveTimer.current);
  },[logs,weekPlan,exDB,bw,loaded]);

  const today=todayFR();
  const todayPlan=weekPlan[todayWeekday()]||[];
  const todayLogs=logs.filter(l=>l.date===today);

  const addLog=useCallback((entry)=>{
    setLogs(prev=>{const i=prev.findIndex(l=>l.date===entry.date&&l.exo===entry.exo);if(i>=0){const n=[...prev];n[i]=entry;return n;}return[entry,...prev];});
  },[]);
  const updateLog=useCallback((updated)=>{
    setLogs(prev=>prev.map(l=>l.date===updated.date&&l.exo===updated.exo?updated:l));
  },[]);
  const removeLog=useCallback((target)=>{
    setLogs(prev=>prev.filter(l=>!(l.date===target.date&&l.exo===target.exo)));
  },[]);

  const logDates=["Tous",...new Set(logs.map(l=>l.date))].sort((a,b)=>a==="Tous"?-1:frSort(b,a));
  const filteredLogs=useMemo(()=>logs.filter(l=>(!logSearch||l.exo.toLowerCase().includes(logSearch.toLowerCase()))&&(logDate==="Tous"||l.date===logDate)).sort((a,b)=>frSort(b.date,a.date)),[logs,logSearch,logDate]);
  const filteredExDB=useMemo(()=>exDB.filter(e=>e.name.toLowerCase().includes(exSearch.toLowerCase())||e.muscle.toLowerCase().includes(exSearch.toLowerCase())),[exDB,exSearch]);

  const typeColors=Object.entries(TYPE_COLORS);

  const navBtn=(key,label)=>(
    <button key={key} onClick={()=>setTab(key)} style={{flex:1,background:tab===key?T.cardHi:"transparent",color:tab===key?T.text:T.faint,border:"none",borderRadius:10,padding:"9px 4px",fontFamily:"'Bebas Neue'",fontSize:13,letterSpacing:1.5,cursor:"pointer",transition:"all .15s",display:"flex",flexDirection:"column",alignItems:"center",gap:3,WebkitTapHighlightColor:"transparent"}}>
      <span style={{display:"block",width:tab===key?20:0,height:2,background:T.red,borderRadius:1,transition:"width .2s",marginBottom:1}}/>
      {label}
    </button>
  );

  return(
    <div style={{minHeight:"100vh",background:T.bg,backgroundImage:T.bgGrad,color:T.text,fontFamily:"'Inter',sans-serif",maxWidth:600,margin:"0 auto"}}>
      <style>{FONTS}{`*{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased;}html,body{background:${T.bg};}::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px;}input::placeholder{color:${T.faint}!important;}select option{background:${T.card};color:${T.text};}input[type=number]::-webkit-inner-spin-button{opacity:.15;}button:active{transform:scale(.98);}select{appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2371717a' d='M6 9L2 5h8z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:30px!important;}body{overflow-x:hidden;}`}</style>

      {timer&&<Timer onClose={()=>setTimer(false)}/>}
      {exModal&&<ExModal initial={exModal.mode==="edit"?exModal.data:null} onSave={d=>{if(exModal.mode==="edit")setExDB(p=>p.map((e,i)=>i===exModal.idx?{...e,...d}:e));else setExDB(p=>[...p,d]);}} onDelete={exModal.mode==="edit"?()=>setExDB(p=>p.filter((_,i)=>i!==exModal.idx)):null} onClose={()=>setExModal(null)}/>}
      {logEdit&&<LogEditor log={logEdit} exDB={exDB} onSave={updateLog} onDelete={removeLog} onClose={()=>setLogEdit(null)} bw={bw}/>}
      {logAdd&&<LogAddModal defaultDate={logAdd.defaultDate} exDB={exDB} onSave={addLog} onClose={()=>setLogAdd(null)} bw={bw}/>}
      {confirm&&<ConfirmModal title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} onConfirm={confirm.onConfirm} onClose={()=>setConfirm(null)}/>}

      {/* HEADER */}
      <div style={{padding:"14px 16px 12px calc(16px + env(safe-area-inset-left, 0px))",paddingRight:"calc(16px + env(safe-area-inset-right, 0px))",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:T.bg+"ee",backdropFilter:"blur(10px)",zIndex:90,borderBottom:`1px solid ${T.border}`}}>
        <div>
          <div style={{display:"flex",alignItems:"baseline",gap:6}}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:30,letterSpacing:3,lineHeight:1,color:T.text}}>KILO</div>
            <div style={{width:6,height:6,borderRadius:3,background:T.red,boxShadow:`0 0 8px ${T.red}88`}}/>
          </div>
          <div style={{fontSize:10,color:T.faint,fontFamily:"'IBM Plex Mono'",marginTop:3,letterSpacing:.5,fontWeight:600}}>{todayLabel().toUpperCase()}</div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <button onClick={()=>{if(Date.now()-lastPullAt.current<2000)return;reloadFromStorage();}} title="Synchroniser maintenant" style={{background:T.ghost,color:saveStatus==="saving"?T.amber:saveStatus==="error"?T.red:T.green,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 11px",fontSize:14,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>↻</button>
          {showBwEdit?(
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              <input type="number" value={bwInput} onChange={e=>setBwInput(e.target.value)} style={{...T.inp,width:70,padding:"8px 10px",fontSize:13}} autoFocus/>
              <button onClick={()=>{setBw(pf(bwInput));setShowBwEdit(false);}} style={btn(T.green,"#fff",{padding:"8px 11px",fontSize:13})}>✓</button>
            </div>
          ):(
            <button onClick={()=>setShowBwEdit(true)} style={{background:T.ghost,color:T.textDim,border:"none",borderRadius:10,padding:"10px 13px",fontSize:11,cursor:"pointer",fontFamily:"'IBM Plex Mono'",fontWeight:800,letterSpacing:.5,WebkitTapHighlightColor:"transparent"}}>PDC {bw}kg</button>
          )}
          <button onClick={()=>setTimer(true)} style={{background:T.ghost,color:T.textDim,border:"none",borderRadius:10,padding:"10px 13px",fontSize:16,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>⏱</button>
          <div style={{minWidth:14,textAlign:"center"}}>
            {saveStatus==="saving"&&<div style={{width:6,height:6,borderRadius:3,background:T.amber,animation:"pulse 1s infinite"}}/>}
            {saveStatus==="saved"&&<div style={{width:6,height:6,borderRadius:3,background:T.green}}/>}
            {saveStatus==="error"&&<div style={{width:6,height:6,borderRadius:3,background:T.red}}/>}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{paddingTop:16,paddingLeft:"calc(14px + env(safe-area-inset-left, 0px))",paddingRight:"calc(14px + env(safe-area-inset-right, 0px))",paddingBottom:"calc(96px + env(safe-area-inset-bottom, 0px))"}}>

        {/* ── SÉANCE ── */}
        {tab==="seance"&&(
          <div>
            {/* Hero card */}
            <div style={{background:T.cardHi,borderRadius:16,padding:"16px 18px",marginBottom:14,border:`1px solid ${T.border}`,position:"relative",overflow:"hidden",boxShadow:T.shadow}}>
              <div style={{position:"absolute",inset:0,background:`radial-gradient(circle at 100% 0%, ${T.red}22 0%, transparent 60%)`,pointerEvents:"none"}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:todayPlan.length>0?12:0,position:"relative"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:13,letterSpacing:3,color:T.dim,marginBottom:2}}>SÉANCE DU JOUR</div>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:32,letterSpacing:1,color:T.text,lineHeight:1}}>{todayWeekday().toUpperCase()}</div>
                  <div style={{fontSize:13,color:T.dim,marginTop:6,fontWeight:600}}>
                    {todayPlan.length>0?<><span style={{color:todayLogs.length===todayPlan.length?T.green:T.text,fontWeight:900,fontSize:18,fontFamily:"'IBM Plex Mono'"}}>{todayLogs.length}</span><span style={{color:T.faint}}>/{todayPlan.length}</span> validés</>:<span style={{color:T.amber}}>Repos · aucun plan</span>}
                  </div>
                </div>
                {todayPlan.length===0&&<button onClick={()=>setTab("plan")} style={btn(T.red,"#fff",{padding:"11px 16px",fontSize:13,boxShadow:`0 4px 12px ${T.red}55`})}>PLANIFIER →</button>}
              </div>
              {todayPlan.length>0&&(
                <div style={{height:6,background:T.ghost,borderRadius:3,overflow:"hidden",position:"relative"}}>
                  <div style={{width:`${Math.round(todayLogs.length/todayPlan.length*100)}%`,height:"100%",background:todayLogs.length===todayPlan.length?`linear-gradient(90deg, ${T.green}, #34d399)`:`linear-gradient(90deg, ${T.red}, #fbbf24)`,borderRadius:3,transition:"width .5s",boxShadow:`0 0 8px ${todayLogs.length===todayPlan.length?T.green:T.red}88`}}/>
                </div>
              )}
            </div>
            {todayPlan.length===0?(
              <div style={{textAlign:"center",padding:"60px 20px",color:T.faint}}>
                <div style={{fontFamily:"'Bebas Neue'",fontSize:60,color:T.faint,letterSpacing:2,marginBottom:6}}>—</div>
                <div style={{fontSize:14,marginBottom:18,color:T.dim}}>Aucun plan pour {todayWeekday().toLowerCase()}</div>
                <button onClick={()=>setTab("plan")} style={btn(T.red,"#fff",{padding:"14px 24px",fontSize:14,boxShadow:`0 4px 16px ${T.red}55`})}>CRÉER LE PLAN →</button>
              </div>
            ):(
              todayPlan.map((p,i)=><ExCard key={i} plan={p} exDB={exDB} onLog={addLog} todayLogs={todayLogs} allLogs={logs} bw={bw}/>)
            )}
          </div>
        )}

        {/* ── PLAN ── */}
        {tab==="plan"&&(
          <div>
            <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:16}}>
              <div style={{fontFamily:"'Bebas Neue'",fontSize:28,color:T.text,letterSpacing:1,lineHeight:1}}>PLANIFICATEUR</div>
              <div style={{fontSize:11,color:T.faint,fontFamily:"'IBM Plex Mono'",fontWeight:700}}>{Object.keys(weekPlan).length} JOUR{Object.keys(weekPlan).length>1?"S":""}</div>
            </div>
            <Planner weekPlan={weekPlan} setWeekPlan={setWeekPlan} exDB={exDB} allLogs={logs} bw={bw}/>
          </div>
        )}

        {/* ── LOGS ── */}
        {tab==="logs"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,gap:8}}>
              <div>
                <div style={{fontFamily:"'Bebas Neue'",fontSize:28,color:T.text,letterSpacing:1,lineHeight:1}}>HISTORIQUE</div>
                <div style={{fontSize:11,color:T.faint,fontFamily:"'IBM Plex Mono'",fontWeight:700,marginTop:3}}>{filteredLogs.length} ENTRÉE{filteredLogs.length>1?"S":""}</div>
              </div>
              <button onClick={()=>setLogAdd({defaultDate:todayFR()})} style={btn(T.green,"#fff",{padding:"11px 16px",fontSize:13,boxShadow:`0 4px 12px ${T.green}55`})}>+ AJOUTER</button>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <input value={logSearch} onChange={e=>setLogSearch(e.target.value)} placeholder="Rechercher un exercice…" style={{...T.inp,flex:1,fontSize:14}}/>
              <select value={logDate} onChange={e=>setLogDate(e.target.value)} style={{...T.inp,flex:"0 0 130px",fontSize:12,cursor:"pointer"}}>
                {logDates.map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            {filteredLogs.length===0&&(
              <div style={{textAlign:"center",padding:"48px 20px",color:T.dim,fontSize:14}}>
                <div style={{fontFamily:"'Bebas Neue'",fontSize:48,color:T.faint,marginBottom:8}}>—</div>
                Aucun log. Appuyez sur "+ Ajouter".
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column"}}>
              {Object.entries(
                filteredLogs.reduce((acc,log)=>{(acc[log.date]=acc[log.date]||[]).push(log);return acc;},{})
              ).sort((a,b)=>frSort(b[0],a[0])).map(([date,entries])=>{
                const dateVol=entries.reduce((s,l)=>s+(l.volume||0),0);
                return(
                  <div key={date} style={{marginBottom:22}}>
                    {/* Date header */}
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,position:"sticky",top:62,zIndex:5,background:T.bg+"f0",backdropFilter:"blur(6px)",padding:"6px 0",borderRadius:8}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:"'Bebas Neue'",fontSize:18,letterSpacing:1.5,color:T.text,lineHeight:1}}>{dowOf(date).toUpperCase()} <span style={{color:T.dim,fontSize:13,letterSpacing:.5}}>· {date}</span></div>
                        <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,color:T.amber,marginTop:3,fontWeight:800,letterSpacing:.5}}>{dateVol.toFixed(0)} KG · {entries.length} EXO{entries.length>1?"S":""}</div>
                      </div>
                      <button onClick={()=>setLogAdd({defaultDate:date})} style={ghostBtn({padding:"7px 11px",fontSize:12,fontFamily:"'Bebas Neue'",letterSpacing:1})}>+ EXO</button>
                    </div>
                    {/* Entries */}
                    {entries.map((log,i)=>{
                      const ex=exDB.find(e=>e.name===log.exo);
                      const tcc=tc(ex?.type||"Push");
                      return(
                        <div key={i} style={{background:T.card,borderRadius:12,padding:"11px 14px",border:`1px solid ${T.border}`,marginBottom:6,position:"relative",overflow:"hidden"}}>
                          <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:tcc.grad}}/>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6,gap:8,paddingLeft:6}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontWeight:800,fontSize:14,color:T.text,letterSpacing:-.2}}>{log.exo}</div>
                              {log.note&&<div style={{fontSize:11,color:T.dim,fontFamily:"'IBM Plex Mono'",marginTop:3,fontStyle:"italic",fontWeight:500}}>« {log.note} »</div>}
                            </div>
                            <div style={{display:"flex",gap:6,alignItems:"center"}}>
                              <div style={{fontFamily:"'IBM Plex Mono'",fontWeight:800,color:tcc.bg,fontSize:12,whiteSpace:"nowrap"}}>{(log.volume||0).toFixed(0)}<span style={{color:T.dim,fontWeight:600}}>kg</span></div>
                              <button onClick={()=>setLogEdit(log)} style={{background:T.ghost,border:"none",cursor:"pointer",color:T.dim,fontSize:13,padding:"6px 9px",borderRadius:8,WebkitTapHighlightColor:"transparent"}}>✏️</button>
                            </div>
                          </div>
                          <div style={{fontFamily:"'IBM Plex Mono'",fontSize:12,color:T.dim,paddingLeft:6,display:"flex",flexWrap:"wrap",gap:"4px 10px",fontWeight:600}}>
                            {log.series.map((s,j)=><span key={j}><span style={{color:T.text,fontWeight:800}}>{s.poids}</span><span style={{color:T.faint}}>kg×</span><span style={{color:T.text,fontWeight:800}}>{s.reps}</span></span>)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STATS ── */}
        {tab==="stats"&&(
          <div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:28,color:T.text,letterSpacing:1,lineHeight:1,marginBottom:16}}>STATISTIQUES</div>
            <Stats logs={logs} exDB={exDB}/>
          </div>
        )}

        {/* ── EXOS ── */}
        {tab==="exos"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,gap:8}}>
              <div>
                <div style={{fontFamily:"'Bebas Neue'",fontSize:28,color:T.text,letterSpacing:1,lineHeight:1}}>EXERCICES</div>
                <div style={{fontSize:11,color:T.faint,fontFamily:"'IBM Plex Mono'",fontWeight:700,marginTop:3}}>{filteredExDB.length} EN BASE</div>
              </div>
              <button onClick={()=>setExModal({mode:"add"})} style={btn(T.red,"#fff",{padding:"11px 16px",fontSize:13,boxShadow:`0 4px 12px ${T.red}55`})}>+ NOUVEAU</button>
            </div>
            {/* Type legend */}
            <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}>
              {typeColors.map(([type,{bg,label}])=>(
                <div key={type} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:T.dim,fontFamily:"'IBM Plex Mono'",fontWeight:700,letterSpacing:.5}}>
                  <div style={{width:10,height:10,borderRadius:3,background:bg}}/>
                  {label.toUpperCase()}
                </div>
              ))}
            </div>
            <input value={exSearch} onChange={e=>setExSearch(e.target.value)} placeholder="Rechercher…" style={{...T.inp,marginBottom:12,fontSize:14}}/>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {filteredExDB.map((ex)=>{
                const tcc=tc(ex.type);
                return(
                  <div key={ex.name} style={{background:T.card,borderRadius:11,padding:"11px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${T.border}`,position:"relative",overflow:"hidden",gap:10}}>
                    <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:tcc.grad}}/>
                    <div style={{flex:1,minWidth:0,paddingLeft:6}}>
                      <div style={{fontWeight:800,fontSize:13,color:T.text,letterSpacing:-.2}}>{ex.name}</div>
                      <div style={{fontSize:10,color:T.dim,marginTop:3,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",fontFamily:"'IBM Plex Mono'",fontWeight:700,letterSpacing:.4}}>
                        <span>{ex.muscle.toUpperCase()}</span>
                        <span style={{background:tcc.soft,color:tcc.bg,borderRadius:4,padding:"1px 6px",fontSize:9,fontWeight:800}}>{ex.type.toUpperCase()}</span>
                        <span style={{color:T.faint}}>×{ex.mult}{ex.barAdd>0?` +${ex.barAdd}KG`:""}{ex.useBodyweight?" · PDC":""}</span>
                      </div>
                    </div>
                    <button onClick={()=>setExModal({mode:"edit",idx:exDB.indexOf(ex),data:{...ex}})} style={{background:T.ghost,border:"none",cursor:"pointer",color:T.dim,fontSize:13,padding:"7px 10px",borderRadius:8,WebkitTapHighlightColor:"transparent"}}>✏️</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:600,background:T.card+"f5",backdropFilter:"blur(12px)",borderTop:`1px solid ${T.border}`,display:"flex",zIndex:90,padding:"6px 6px",paddingLeft:"calc(6px + env(safe-area-inset-left, 0px))",paddingRight:"calc(6px + env(safe-area-inset-right, 0px))",paddingBottom:"calc(6px + env(safe-area-inset-bottom, 0px))",gap:2}}>
        {[["seance","SÉANCE"],["plan","PLAN"],["logs","LOGS"],["stats","STATS"],["exos","EXOS"]].map(([k,l])=>navBtn(k,l))}
      </div>
    </div>
  );
}
