import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { loadData, saveData, exportJSON, importJSON } from "./storage.js";

/* ─── FONTS ──────────────────────────────────────────────────────────────── */
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;700&family=Inter:wght@400;500;600;700;800&display=swap');`;

/* ─── COLOR SYSTEM: Push / Pull / Legs / Gainage ────────────────────────── */
// Simple, meaningful, not blue-heavy. Warm neutrals + 4 accent colors.
const TYPE_COLORS = {
  Push:    { bg: "#dc2626", dim: "#dc262620", label: "Push",    dot: "🔴" },
  Pull:    { bg: "#16a34a", dim: "#16a34a20", label: "Pull",    dot: "🟢" },
  Legs:    { bg: "#d97706", dim: "#d9770620", label: "Jambes",  dot: "🟡" },
  Gainage: { bg: "#7c3aed", dim: "#7c3aed20", label: "Gainage", dot: "🟣" },
};
const tc = (type) => TYPE_COLORS[type] || { bg: "#64748b", dim: "#64748b20", label: type, dot: "⚪" };

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

/* ─── INITIAL PLANS ──────────────────────────────────────────────────────── */
const INIT_PLANS = {
  "20/04/2026":[
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
  "22/04/2026":[
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
  "24/04/2026":[
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
// Warm dark theme — off-black, warm grays, no blue background
const T = {
  bg:    "#111010",
  card:  "#1c1b1b",
  card2: "#252424",
  border:"#2e2c2c",
  text:  "#e8e4e0",
  dim:   "#8a8580",
  faint: "#3a3836",
  inp:   {background:"#1c1b1b",color:"#e8e4e0",border:"1px solid #3a3836",borderRadius:10,fontFamily:"'Inter',sans-serif",fontSize:15,outline:"none",width:"100%",padding:"11px 12px"},
  lbl:   {fontSize:10,color:"#5a5855",fontFamily:"'IBM Plex Mono'",textTransform:"uppercase",letterSpacing:1,marginBottom:5,display:"block"},
};
const btn = (bg="#dc2626",fg="#fff",extra={}) => ({background:bg,color:fg,border:"none",borderRadius:10,padding:"12px 20px",fontFamily:"'Inter',sans-serif",fontSize:14,cursor:"pointer",fontWeight:600,...extra});

/* ─── TIMER ──────────────────────────────────────────────────────────────── */
function Timer({onClose}) {
  const P=[60,90,120,180];
  const [t,setT]=useState(90),[r,setR]=useState(90),[run,setRun]=useState(false),[done,setDone]=useState(false);
  const iv=useRef();
  const go=s=>{clearInterval(iv.current);setT(s);setR(s);setDone(false);setRun(true);iv.current=setInterval(()=>setR(x=>{if(x<=1){clearInterval(iv.current);setRun(false);setDone(true);return 0;}return x-1;}),1000);};
  useEffect(()=>()=>clearInterval(iv.current),[]);
  const R=54,C=2*Math.PI*R,pct=t>0?1-r/t:1;
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"#0009",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:20,padding:"28px 32px",textAlign:"center",minWidth:260}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:11,letterSpacing:5,color:T.dim,marginBottom:16}}>REPOS</div>
        <svg width={120} height={120} style={{display:"block",margin:"0 auto 14px"}}>
          <circle cx={60} cy={60} r={R} fill="none" stroke={T.faint} strokeWidth={7}/>
          <circle cx={60} cy={60} r={R} fill="none" stroke={done?"#16a34a":"#e8e4e0"} strokeWidth={7} strokeDasharray={C} strokeDashoffset={C-pct*C} strokeLinecap="round" transform="rotate(-90 60 60)" style={{transition:"stroke-dashoffset 1s linear,stroke .3s"}}/>
          <text x={60} y={65} textAnchor="middle" fill={done?"#16a34a":T.text} style={{fontFamily:"'IBM Plex Mono'",fontSize:done?28:24,fontWeight:700}}>{done?"✓":`${String(Math.floor(r/60)).padStart(2,"0")}:${String(r%60).padStart(2,"0")}`}</text>
        </svg>
        <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:14}}>
          {P.map(s=><button key={s} onClick={()=>go(s)} style={{background:t===s&&run?T.text:T.faint,color:t===s&&run?T.bg:T.dim,border:"none",borderRadius:8,padding:"6px 10px",fontFamily:"'IBM Plex Mono'",fontSize:11,cursor:"pointer",fontWeight:700}}>{s<60?`${s}s`:`${s/60}min`}</button>)}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          {run?<button onClick={()=>{clearInterval(iv.current);setRun(false);}} style={btn(T.faint,T.text)}>⏸</button>:<button onClick={()=>go(t)} style={btn(T.text,T.bg)}>▶</button>}
          <button onClick={onClose} style={btn(T.faint,T.dim)}>✕</button>
        </div>
      </div>
    </div>
  );
}

/* ─── EXERCISE CARD (séance) ─────────────────────────────────────────────── */
function ExCard({plan, exDB, onLog, todayLogs, allLogs, bw}) {
  const ex = exDB.find(e=>e.name===plan.exo);
  const col = tc(ex?.type||"Push").bg;
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

  const colDim = tc(ex?.type||"Push").dim;

  if(!open) return(
    <div onClick={()=>setOpen(true)} style={{background:T.card,borderRadius:12,padding:"13px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",borderLeft:`3px solid ${col}`,marginBottom:8}}>
      <div>
        <div style={{fontWeight:700,fontSize:15,color:T.text}}>{plan.exo}</div>
        <div style={{fontSize:12,color:T.dim,marginTop:3,fontFamily:"'IBM Plex Mono'"}}>
          {plan.objPoids>0?`${plan.objPoids}kg`:"PDC"} × {plan.objReps} × {plan.objSeries}
          {alreadyLogged&&<span style={{marginLeft:10,color:"#16a34a"}}>✓ validé</span>}
          {!alreadyLogged&&nDone>0&&<span style={{marginLeft:10,color:col}}>{nDone}/{series.length}</span>}
        </div>
      </div>
      <span style={{color:T.faint,fontSize:20}}>›</span>
    </div>
  );

  return(
    <div style={{background:T.card,borderRadius:14,marginBottom:8,borderLeft:`3px solid ${col}`,overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"14px 16px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{fontWeight:800,fontSize:16,color:T.text}}>{plan.exo}</span>
            <span style={{fontSize:10,background:colDim,color:col,borderRadius:6,padding:"2px 7px",fontFamily:"'IBM Plex Mono'",fontWeight:700}}>{ex?.type}</span>
            {ex?.useBodyweight&&<span style={{fontSize:10,background:T.faint,color:T.dim,borderRadius:6,padding:"2px 7px",fontFamily:"'IBM Plex Mono'"}}>PDC +{bw}kg</span>}
          </div>
          {/* Stats mini-grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:5,marginBottom:12}}>
            {[
              {l:"Dernière perf",v:lastPerf,c:T.text},
              {l:"Meilleur PR",v:prPoids>0?`${prPoids.toFixed(1)} kg`:"—",c:"#16a34a"},
              {l:"PR Volume",v:prVol>0?`${prVol.toFixed(0)} kg`:"—",c:"#d97706"},
              {l:"Obj. volume",v:objVol>0?`${objVol.toFixed(0)} kg`:"—",c:col},
            ].map(({l,v,c})=>(
              <div key={l} style={{background:T.card2,borderRadius:8,padding:"7px 10px"}}>
                <div style={{fontSize:11,color:T.dim,fontFamily:"'IBM Plex Mono'",textTransform:"uppercase",letterSpacing:.8,marginBottom:2}}>{l}</div>
                <div style={{fontSize:13,fontFamily:"'IBM Plex Mono'",color:c,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",color:T.dim,cursor:"pointer",fontSize:22,paddingLeft:10,paddingTop:0}}>⌃</button>
      </div>

      <div style={{padding:"0 16px 16px"}}>
        {/* Column headers */}
        <div style={{display:"grid",gridTemplateColumns:"20px 1fr 1fr 44px 32px",gap:6,marginBottom:5,padding:"0 2px"}}>
          <div/><div style={{...T.lbl,textAlign:"center",marginBottom:0}}>kg</div><div style={{...T.lbl,textAlign:"center",marginBottom:0}}>reps</div><div style={{...T.lbl,textAlign:"center",marginBottom:0}}>✓</div><div/>
        </div>
        {series.map((s,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"20px 1fr 1fr 44px 32px",gap:6,marginBottom:8,opacity:s.done?.4:1}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:T.faint,fontFamily:"'IBM Plex Mono'",fontWeight:700}}>{i+1}</div>
            <input type="number" step="0.5" inputMode="decimal" value={s.poids} onChange={e=>upd(i,"poids",e.target.value)} placeholder={String(plan.objPoids||0)}
              style={{...T.inp,fontSize:19,fontWeight:800,textAlign:"center",color:s.done?"#16a34a":T.text,borderColor:s.done?"#16a34a44":T.border,padding:"13px 4px"}}/>
            <input type="number" inputMode="numeric" value={s.reps} onChange={e=>upd(i,"reps",e.target.value)} placeholder={String(plan.objReps)}
              style={{...T.inp,fontSize:19,fontWeight:800,textAlign:"center",color:s.done?"#16a34a":T.text,borderColor:s.done?"#16a34a44":T.border,padding:"13px 4px"}}/>
            <button onClick={()=>tog(i)} style={{background:s.done?"#16a34a18":"none",border:`1.5px solid ${s.done?"#16a34a":T.border}`,borderRadius:10,cursor:"pointer",fontSize:18,color:s.done?"#16a34a":T.faint,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>
              {s.done?"✓":"○"}
            </button>
            <button onClick={()=>setSeries(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:T.faint,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
        ))}
        <button onClick={()=>setSeries(p=>[...p,{poids:p[p.length-1]?.poids||String(plan.objPoids||""),reps:"",done:false}])}
          style={{background:"none",border:`1px dashed ${T.border}`,borderRadius:10,color:T.dim,fontSize:13,cursor:"pointer",padding:"9px",width:"100%",marginBottom:12,fontFamily:"'Inter',sans-serif"}}>
          + Ajouter une série
        </button>
        {vol>0&&(
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:13}}>
              <span style={{color:T.dim}}>Volume : <strong style={{color:col}}>{vol.toFixed(0)} kg</strong></span>
              {objVol>0&&<span style={{color:vol>=objVol?"#16a34a":T.dim}}>{vol>=objVol?"✓ objectif atteint":`/ ${objVol.toFixed(0)} kg`}</span>}
            </div>
            {objVol>0&&<div style={{height:4,background:T.faint,borderRadius:2}}><div style={{width:`${Math.min(vol/objVol*100,100)}%`,height:"100%",background:vol>=objVol?"#16a34a":col,borderRadius:2,transition:"width .3s"}}/></div>}
          </div>
        )}
        <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Remarque…"
          style={{...T.inp,marginBottom:12,fontSize:14}}/>
        <button onClick={doLog} style={{...btn(allDone?"#16a34a":col),width:"100%",padding:"14px",fontSize:15}}>
          {alreadyLogged?"↩ Re-valider":"✓ Valider"}
        </button>
      </div>
    </div>
  );
}

/* ─── PLANNER ────────────────────────────────────────────────────────────── */
function Planner({plans, setPlans, exDB, allLogs, bw}) {
  const today = todayFR();
  const dates = Object.keys(plans).sort(frSort);
  const [sel,setSel]=useState(dates.includes(today)?today:(dates[dates.length-1]||today));
  const [step,setStep]=useState("list"); // list | addex | confirm
  const [search,setSearch]=useState("");
  const [pickedEx,setPickedEx]=useState(null);
  const [form,setForm]=useState({objPoids:"",objReps:"8",objSeries:"3"});
  const [editIdx,setEditIdx]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [newDate,setNewDate]=useState("");
  const [showND,setShowND]=useState(false);
  const [muscleFilter,setMuscleFilter]=useState("Tous");

  const currPlan = plans[sel]||[];
  const set = (d,p) => setPlans(prev=>({...prev,[d]:p}));

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

  const createDate=()=>{
    if(/^\d{2}\/\d{2}\/\d{4}$/.test(newDate.trim())){setPlans(p=>({...p,[newDate.trim()]:p[newDate.trim()]||[]}));setSel(newDate.trim());setShowND(false);setNewDate("");}
  };

  const st=pickedEx?exStats[pickedEx.name]:null;
  const objVol=pickedEx?realW(pf(form.objPoids),pickedEx,bw)*pf(form.objReps)*pf(form.objSeries):0;

  // Step: choose exercise
  if(step==="addex") return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
        <button onClick={()=>{setStep("list");setSearch("");}} style={btn(T.faint,T.dim,{padding:"8px 14px",fontSize:13})}>← Retour</button>
        <span style={{fontWeight:700,fontSize:16,color:T.text}}>Choisir un exercice</span>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher…" style={{...T.inp,fontSize:14}}/>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {muscles.map(m=><button key={m} onClick={()=>setMuscleFilter(m)} style={{background:muscleFilter===m?T.text:T.faint,color:muscleFilter===m?T.bg:T.dim,border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,cursor:"pointer",fontFamily:"'IBM Plex Mono'",fontWeight:700}}>{m}</button>)}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:400,overflowY:"auto"}}>
        {filteredEx.map(ex=>{
          const s=exStats[ex.name];
          const c=tc(ex.type).bg;
          return(
            <button key={ex.name} onClick={()=>{setPickedEx(ex);setStep("confirm");}} style={{background:T.card,border:`1px solid ${T.border}`,borderLeft:`3px solid ${c}`,borderRadius:10,padding:"11px 14px",cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:T.text}}>{ex.name}</div>
                <div style={{fontSize:11,color:T.dim,marginTop:2}}>{ex.muscle} · {ex.mult>1?`×${ex.mult} bras`:""}{ex.barAdd>0?` +${ex.barAdd}kg barre`:""}</div>
              </div>
              <div style={{textAlign:"right",fontSize:11,fontFamily:"'IBM Plex Mono'",color:T.dim}}>
                {s.prPoids>0&&<div style={{color:"#16a34a",fontWeight:700}}>PR {s.prPoids.toFixed(1)}kg</div>}
                {s.nSessions>0&&<div>{s.nSessions} séances</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Step: set objective with full stats
  if(step==="confirm"&&pickedEx) return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <button onClick={()=>setStep("addex")} style={btn(T.faint,T.dim,{padding:"8px 14px",fontSize:13})}>← Retour</button>
        <span style={{fontWeight:700,fontSize:16,color:T.text}}>{pickedEx.name}</span>
      </div>
      {/* Historical stats */}
      <div style={{background:T.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${T.border}`}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:12,letterSpacing:3,color:T.dim,marginBottom:10}}>HISTORIQUE</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[
            {l:"Dernière perf",v:st?.lastPerf||"—",c:T.text},
            {l:"Dernière date",v:st?.lastDate||"—",c:T.dim},
            {l:"Meilleur PR",v:st?.prPoids>0?`${st.prPoids.toFixed(1)} kg`:"—",c:"#16a34a"},
            {l:"PR Volume",v:st?.prVol>0?`${st.prVol.toFixed(0)} kg`:"—",c:"#d97706"},
          ].map(({l,v,c})=>(
            <div key={l} style={{background:T.card2,borderRadius:8,padding:"8px 10px"}}>
              <div style={{fontSize:11,color:T.dim,fontFamily:"'IBM Plex Mono'",textTransform:"uppercase",letterSpacing:.8,marginBottom:2}}>{l}</div>
              <div style={{fontSize:13,color:c,fontWeight:700,fontFamily:"'IBM Plex Mono'"}}>{v}</div>
            </div>
          ))}
        </div>
        {/* Last 3 sessions */}
        {allLogs.filter(l=>l.exo===pickedEx.name).sort((a,b)=>frSort(b.date,a.date)).slice(0,3).map(l=>(
          <div key={l.date+l.exo} style={{borderTop:`1px solid ${T.border}`,marginTop:10,paddingTop:10}}>
            <div style={{fontSize:11,color:T.dim,fontFamily:"'IBM Plex Mono'",marginBottom:3}}>{l.date} — {l.volume.toFixed(0)} kg vol</div>
            <div style={{fontSize:12,fontFamily:"'IBM Plex Mono'",color:T.text}}>{l.series.map(s=>`${s.poids}×${s.reps}`).join("  ")}</div>
          </div>
        ))}
      </div>
      {/* Set objective */}
      <div style={{background:T.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${T.border}`}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:12,letterSpacing:3,color:T.dim,marginBottom:10}}>OBJECTIF DU JOUR</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
          {[{k:"objPoids",l:"Poids (kg)"},{k:"objReps",l:"Reps"},{k:"objSeries",l:"Séries"}].map(({k,l})=>(
            <div key={k}>
              <label style={T.lbl}>{l}</label>
              <input type="number" step={k==="objPoids"?"0.5":"1"} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={{...T.inp,textAlign:"center"}}/>
            </div>
          ))}
        </div>
        {objVol>0&&<div style={{fontSize:13,color:T.dim,marginBottom:12}}>Volume objectif : <strong style={{color:"#d97706"}}>{objVol.toFixed(0)} kg</strong></div>}
        <button onClick={confirmAdd} style={{...btn(),width:"100%",padding:"13px",fontSize:15}}>+ Ajouter au plan</button>
      </div>
    </div>
  );

  // Main list
  return(
    <div>
      {/* Date bar */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        {dates.map(d=>(
          <button key={d} onClick={()=>setSel(d)} style={{background:sel===d?T.text:T.card,color:sel===d?T.bg:d===today?"#dc2626":T.dim,border:`1px solid ${sel===d?T.text:d===today?"#dc262644":T.border}`,borderRadius:8,padding:"6px 12px",fontFamily:"'IBM Plex Mono'",fontSize:11,cursor:"pointer",fontWeight:700,textAlign:"left"}}>
            <div>{d}</div>
            <div style={{fontSize:11,opacity:.7,fontWeight:400}}>{dowOf(d)}</div>
          </button>
        ))}
        {showND?(
          <div style={{display:"flex",gap:5,alignItems:"center"}}>
            <input value={newDate} onChange={e=>setNewDate(e.target.value)} placeholder="JJ/MM/AAAA" style={{...T.inp,width:120,fontSize:12,padding:"6px 8px"}}/>
            <button onClick={createDate} style={btn(T.text,T.bg,{padding:"6px 10px",fontSize:12})}>✓</button>
            <button onClick={()=>setShowND(false)} style={btn(T.faint,T.dim,{padding:"6px 10px",fontSize:12})}>✕</button>
          </div>
        ):(
          <button onClick={()=>setShowND(true)} style={btn(T.faint,T.dim,{padding:"6px 12px",fontSize:12})}>+ Date</button>
        )}
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:15,fontWeight:700,color:T.text}}>{dowOf(sel)} {sel} <span style={{color:T.dim,fontWeight:400,fontSize:13}}>({currPlan.length} exo{currPlan.length>1?"s":""})</span></div>
        <button onClick={()=>setStep("addex")} style={btn()}>+ Exercice</button>
      </div>

      {currPlan.length===0?(
        <div style={{textAlign:"center",padding:48,color:T.dim,fontSize:14}}>Aucun exercice — appuyez sur "+ Exercice"</div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {/* Header */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 90px 90px 70px 60px 40px",gap:6,padding:"6px 10px",fontSize:10,color:T.faint,fontFamily:"'IBM Plex Mono'",textTransform:"uppercase",letterSpacing:.8}}>
            <div>Exercice</div><div style={{textAlign:"center"}}>Objectif</div><div style={{textAlign:"center"}}>Dernière perf</div><div style={{textAlign:"center"}}>PR poids</div><div style={{textAlign:"center"}}>Obj.vol</div><div/>
          </div>
          {currPlan.map((p,i)=>{
            const ex=exDB.find(e=>e.name===p.exo);
            const c=tc(ex?.type||"Push").bg;
            const s=exStats[p.exo]||{lastPerf:"—",prPoids:0,prVol:0};
            const ov=realW(p.objPoids,ex,bw)*p.objReps*p.objSeries;
            if(editIdx===i) return(
              <div key={i} style={{background:T.card,borderLeft:`3px solid ${c}`,borderRadius:10,padding:12,marginBottom:2}}>
                <div style={{fontWeight:700,fontSize:13,color:T.text,marginBottom:8}}>{p.exo}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto auto",gap:6}}>
                  {[["objPoids","kg"],["objReps","reps"],["objSeries","séries"]].map(([k,l])=>(
                    <div key={k}><label style={T.lbl}>{l}</label><input type="number" step={k==="objPoids"?"0.5":"1"} value={editForm[k]} onChange={e=>setEditForm(f=>({...f,[k]:e.target.value}))} style={{...T.inp,fontSize:13}}/></div>
                  ))}
                  <div style={{display:"flex",alignItems:"flex-end",gap:4}}>
                    <button onClick={()=>{set(sel,currPlan.map((px,j)=>j===i?{...px,objPoids:pf(editForm.objPoids),objReps:parseInt(editForm.objReps)||8,objSeries:parseInt(editForm.objSeries)||3}:px));setEditIdx(null);}} style={btn(T.text,T.bg,{padding:"10px 12px",fontSize:12})}>✓</button>
                    <button onClick={()=>setEditIdx(null)} style={btn(T.faint,T.dim,{padding:"10px 12px",fontSize:12})}>✕</button>
                  </div>
                </div>
              </div>
            );
            return(
              <div key={i} style={{background:T.card,borderLeft:`3px solid ${c}`,borderRadius:10,padding:"10px 12px",marginBottom:2,display:"grid",gridTemplateColumns:"1fr 90px 90px 70px 60px 40px",gap:6,alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:T.text}}>{p.exo}</div>
                  <div style={{fontSize:11,color:T.dim,fontFamily:"'IBM Plex Mono'",marginTop:1}}>{ex?.muscle}</div>
                </div>
                <div style={{textAlign:"center",fontFamily:"'IBM Plex Mono'",fontSize:11,color:c,fontWeight:700}}>{p.objPoids>0?`${p.objPoids}kg`:"PDC"}<span style={{color:T.dim,fontWeight:400}}> ×{p.objReps}×{p.objSeries}</span></div>
                <div style={{textAlign:"center",fontFamily:"'IBM Plex Mono'",fontSize:11,color:T.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.lastPerf}</div>
                <div style={{textAlign:"center",fontFamily:"'IBM Plex Mono'",fontSize:11,color:"#16a34a",fontWeight:700}}>{s.prPoids>0?`${s.prPoids.toFixed(1)}kg`:"—"}</div>
                <div style={{textAlign:"center",fontFamily:"'IBM Plex Mono'",fontSize:11,color:"#d97706",fontWeight:700}}>{ov>0?`${ov.toFixed(0)}kg`:"—"}</div>
                <div style={{display:"flex",gap:2,justifyContent:"flex-end"}}>
                  <button onClick={()=>{setEditIdx(i);setEditForm({...p});}} style={{background:"none",border:"none",cursor:"pointer",color:T.dim,fontSize:14,padding:"2px 4px"}}>✏️</button>
                  <button onClick={()=>set(sel,currPlan.filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:T.faint,fontSize:16,padding:"2px 4px"}}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── STATS ──────────────────────────────────────────────────────────────── */
function Stats({logs, exDB}) {
  const [fExo,setFExo]=useState("Tous");
  const [fMuscle,setFMuscle]=useState("Tous");
  const [fType,setFType]=useState("Tous");
  const [tooltip,setTooltip]=useState(null);

  const allExos=["Tous",...new Set(logs.map(l=>l.exo))].sort();
  const allMuscles=["Tous",...MUSCLE_GROUPS.filter(m=>logs.some(l=>l.muscle===m))];

  const filtered=useMemo(()=>logs.filter(l=>{
    if(fExo!=="Tous"&&l.exo!==fExo)return false;
    if(fMuscle!=="Tous"&&l.muscle!==fMuscle)return false;
    const ex=exDB.find(e=>e.name===l.exo);
    if(fType!=="Tous"&&ex?.type!==fType)return false;
    return true;
  }),[logs,fExo,fMuscle,fType,exDB]);

  const byDate=useMemo(()=>{
    const m={};filtered.forEach(l=>{m[l.date]=(m[l.date]||0)+(l.volume||0);});
    return Object.entries(m).sort((a,b)=>frSort(a[0],b[0]));
  },[filtered]);

  const totalVol=filtered.reduce((a,l)=>a+(l.volume||0),0);
  const nSess=[...new Set(filtered.map(l=>l.date))].length;

  const prPerExo=useMemo(()=>{
    const m={};
    filtered.forEach(l=>{const ex=exDB.find(e=>e.name===l.exo);l.series.forEach(s=>{const rw=realW(s.poids,ex,0);if(!m[l.exo]||rw>m[l.exo].poids)m[l.exo]={poids:rw,reps:pf(s.reps),date:l.date,type:l.type};});});
    return Object.entries(m).sort((a,b)=>b[1].poids-a[1].poids);
  },[filtered,exDB]);

  const volByExo=useMemo(()=>{const m={};filtered.forEach(l=>{m[l.exo]=(m[l.exo]||0)+(l.volume||0);});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[ filtered]);

  const volByMuscle=useMemo(()=>{const m={};filtered.forEach(l=>{m[l.muscle]=(m[l.muscle]||0)+(l.volume||0);});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[ filtered]);

  const chartData=byDate.slice(-20);
  const chartMax=Math.max(...chartData.map(d=>d[1]),1);
  const chartMin=Math.min(...chartData.map(d=>d[1]),0);

  // SVG chart with tooltip
  const W=440,H=80,P=8;
  const pts=chartData.map((d,i)=>({x:P+(i/(Math.max(chartData.length-1,1)))*(W-P*2),y:H-P-((d[1]-chartMin)/Math.max(chartMax-chartMin,1))*(H-P*2),date:d[0],vol:d[1]}));
  const path=pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Filters */}
      <div style={{background:T.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${T.border}`}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
          {[
            {l:"Type",v:fType,s:setFType,opts:["Tous","Push","Pull","Legs","Gainage"]},
            {l:"Muscle",v:fMuscle,s:setFMuscle,opts:allMuscles},
            {l:"Exercice",v:fExo,s:setFExo,opts:allExos},
          ].map(({l,v,s,opts})=>(
            <div key={l} style={{flex:"1 1 120px",minWidth:110}}>
              <label style={T.lbl}>{l}</label>
              <select value={v} onChange={e=>s(e.target.value)} style={{...T.inp,fontSize:12,padding:"8px 10px",cursor:"pointer"}}>
                {opts.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          {(fExo!=="Tous"||fMuscle!=="Tous"||fType!=="Tous")&&
            <button onClick={()=>{setFExo("Tous");setFMuscle("Tous");setFType("Tous");}} style={btn(T.faint,T.dim,{padding:"8px 12px",fontSize:12,alignSelf:"flex-end"})}>✕ Reset</button>}
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {[
          {l:"Séances",v:nSess,c:"#e8e4e0"},
          {l:"Volume total",v:`${(totalVol/1000).toFixed(1)}t`,c:"#16a34a"},
          {l:"Moy./séance",v:nSess>0?`${(totalVol/nSess/1000).toFixed(1)}t`:"—",c:"#d97706"},
        ].map(({l,v,c})=>(
          <div key={l} style={{background:T.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${T.border}`}}>
            <div style={{fontSize:11,color:T.dim,fontFamily:"'IBM Plex Mono'",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>{l}</div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:32,color:c,letterSpacing:1}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length>=2&&(
        <div style={{background:T.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${T.border}`,position:"relative"}}>
          <div style={{fontWeight:700,fontSize:14,color:T.text,marginBottom:10}}>Volume par séance</div>
          <div style={{position:"relative"}}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H,overflow:"visible"}}
              onMouseLeave={()=>setTooltip(null)}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e8e4e0" stopOpacity=".12"/>
                  <stop offset="100%" stopColor="#e8e4e0" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d={`${path} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`} fill="url(#sg)"/>
              <path d={path} stroke="#e8e4e0" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
              {pts.map((p,i)=>(
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={14} fill="transparent" onMouseEnter={()=>setTooltip({x:p.x,y:p.y,date:p.date,vol:p.vol})}/>
                  <circle cx={p.x} cy={p.y} r={3} fill={tooltip?.date===p.date?"#dc2626":"#e8e4e0"} opacity={.8}/>
                </g>
              ))}
              {tooltip&&(()=>{
                const tx=Math.min(Math.max(tooltip.x-45,0),W-110);
                return(
                  <g>
                    <rect x={tx} y={Math.max(tooltip.y-42,2)} width={110} height={36} rx={6} fill={T.card2} stroke={T.border} strokeWidth={1}/>
                    <text x={tx+8} y={Math.max(tooltip.y-26,18)} fill={T.dim} style={{fontSize:9,fontFamily:"'IBM Plex Mono'"}}>{tooltip.date}</text>
                    <text x={tx+8} y={Math.max(tooltip.y-12,32)} fill={T.text} style={{fontSize:11,fontFamily:"'IBM Plex Mono'",fontWeight:700}}>{tooltip.vol.toFixed(0)} kg</text>
                  </g>
                );
              })()}
            </svg>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:10,color:T.faint,fontFamily:"'IBM Plex Mono'"}}><span>{chartData[0][0]}</span><span>{chartData[chartData.length-1][0]}</span></div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {/* PRs */}
        {prPerExo.length>0&&(
          <div style={{background:T.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${T.border}`}}>
            <div style={{fontWeight:700,fontSize:13,color:T.text,marginBottom:10}}>Records personnels</div>
            {prPerExo.slice(0,10).map(([exo,pr])=>{
              const c=tc(pr.type).bg;
              return(
                <div key={exo} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${T.border}`}}>
                  <div style={{fontSize:12,color:T.dim,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:8}}>{exo}</div>
                  <div style={{fontFamily:"'IBM Plex Mono'",color:"#16a34a",fontWeight:700,fontSize:12,whiteSpace:"nowrap"}}>{pr.poids.toFixed(1)} kg × {pr.reps}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Volume by muscle */}
        {volByMuscle.length>0&&(
          <div style={{background:T.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${T.border}`}}>
            <div style={{fontWeight:700,fontSize:13,color:T.text,marginBottom:10}}>Volume par muscle</div>
            {volByMuscle.slice(0,8).map(([muscle,vol])=>{
              const ex=exDB.find(e=>e.muscle===muscle);
              const bc=tc(ex?.type||"Push").bg;
              const mx=volByMuscle[0][1];
              return(
                <div key={muscle} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:12}}>
                    <span style={{color:T.dim}}>{muscle}</span>
                    <span style={{fontFamily:"'IBM Plex Mono'",color:bc,fontSize:11,fontWeight:700}}>{(vol/1000).toFixed(1)}t</span>
                  </div>
                  <div style={{height:3,background:T.faint,borderRadius:2}}><div style={{width:`${(vol/mx)*100}%`,height:"100%",background:bc,borderRadius:2}}/></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Volume by exo */}
      {volByExo.length>0&&(
        <div style={{background:T.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${T.border}`}}>
          <div style={{fontWeight:700,fontSize:13,color:T.text,marginBottom:10}}>Volume cumulé par exercice</div>
          {volByExo.slice(0,10).map(([exo,vol])=>{
            const ex=exDB.find(e=>e.name===exo);
            const bc=tc(ex?.type||"Push").bg;
            const mx=volByExo[0][1];
            return(
              <div key={exo} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:12}}>
                  <span style={{color:T.dim}}>{exo}</span>
                  <span style={{fontFamily:"'IBM Plex Mono'",color:bc,fontSize:11,fontWeight:700}}>{vol.toFixed(0)} kg</span>
                </div>
                <div style={{height:3,background:T.faint,borderRadius:2}}><div style={{width:`${(vol/mx)*100}%`,height:"100%",background:bc,borderRadius:2}}/></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── LOG EDITOR MODAL ───────────────────────────────────────────────────── */
function LogEditor({log, exDB, onSave, onClose, bw}) {
  const ex = exDB.find(e=>e.name===log.exo);
  const [series,setSeries]=useState(log.series.map(s=>({poids:String(s.poids),reps:String(s.reps)})));
  const [note,setNote]=useState(log.note||"");
  const upd=(i,f,v)=>setSeries(p=>p.map((s,j)=>j===i?{...s,[f]:v}:s));
  const save=()=>{
    const newVol=calcVol(series,ex,bw);
    onSave({...log,series:series.map(s=>({poids:pf(s.poids),reps:pf(s.reps)})),volume:newVol,note});
    onClose();
  };
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"#0009",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:"16px 16px 0 0",padding:"20px 16px",width:"100%",maxWidth:600,maxHeight:"80vh",overflowY:"auto",border:`1px solid ${T.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontWeight:700,fontSize:16,color:T.text}}>{log.exo}</div>
            <div style={{fontSize:12,color:T.dim,fontFamily:"'IBM Plex Mono'"}}>{log.date}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.dim,fontSize:24,cursor:"pointer"}}>×</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10,fontSize:12,color:T.faint,fontFamily:"'IBM Plex Mono'",textTransform:"uppercase",letterSpacing:.8}}>
          <div style={{textAlign:"center"}}>kg affiché</div><div style={{textAlign:"center"}}>reps</div>
        </div>
        {series.map((s,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"20px 1fr 1fr 30px",gap:6,marginBottom:8,alignItems:"center"}}>
            <div style={{fontSize:12,color:T.faint,textAlign:"center",fontFamily:"'IBM Plex Mono'"}}>{i+1}</div>
            <input type="number" step="0.5" value={s.poids} onChange={e=>upd(i,"poids",e.target.value)} style={{...T.inp,textAlign:"center",fontSize:18,fontWeight:700,padding:"11px 4px"}}/>
            <input type="number" value={s.reps} onChange={e=>upd(i,"reps",e.target.value)} style={{...T.inp,textAlign:"center",fontSize:18,fontWeight:700,padding:"11px 4px"}}/>
            <button onClick={()=>setSeries(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:T.faint,fontSize:18}}>×</button>
          </div>
        ))}
        <button onClick={()=>setSeries(p=>[...p,{poids:"",reps:""}])} style={{background:"none",border:`1px dashed ${T.border}`,borderRadius:10,color:T.dim,fontSize:13,cursor:"pointer",padding:"8px",width:"100%",marginBottom:12}}>+ Série</button>
        <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Remarque…" style={{...T.inp,marginBottom:12}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <button onClick={save} style={btn(T.text,T.bg,{padding:"12px",fontSize:14})}>✓ Enregistrer</button>
          <button onClick={onClose} style={btn(T.faint,T.dim,{padding:"12px",fontSize:14})}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

/* ─── EX MODAL ───────────────────────────────────────────────────────────── */
function ExModal({initial, onSave, onClose, exDB}) {
  const [f,setF]=useState(initial||{name:"",muscle:"Pectoraux",type:"Push",mult:1,barAdd:0,useBodyweight:false});
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"#0009",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:"16px 16px 0 0",padding:"20px 16px",width:"100%",maxWidth:500,border:`1px solid ${T.border}`}}>
        <div style={{fontWeight:700,fontSize:16,color:T.text,marginBottom:16}}>{initial?"Modifier":"Nouvel exercice"}</div>
        <div style={{marginBottom:12}}><label style={T.lbl}>Nom</label><input value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} style={T.inp}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div><label style={T.lbl}>Muscle</label><select value={f.muscle} onChange={e=>setF(p=>({...p,muscle:e.target.value}))} style={{...T.inp,cursor:"pointer"}}>{MUSCLE_GROUPS.map(m=><option key={m}>{m}</option>)}</select></div>
          <div><label style={T.lbl}>Type</label><select value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))} style={{...T.inp,cursor:"pointer"}}>{["Push","Pull","Legs","Gainage"].map(t=><option key={t}>{t}</option>)}</select></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div><label style={T.lbl}>Multiplicateur</label><select value={f.mult} onChange={e=>setF(p=>({...p,mult:Number(e.target.value)}))} style={{...T.inp,cursor:"pointer"}}><option value={1}>×1 — 1 côté</option><option value={2}>×2 — 2 bras</option></select></div>
          <div><label style={T.lbl}>+ Barre (kg)</label><input type="number" value={f.barAdd} onChange={e=>setF(p=>({...p,barAdd:Number(e.target.value)}))} style={T.inp}/></div>
        </div>
        <label style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,cursor:"pointer",fontSize:14,color:T.dim}}>
          <input type="checkbox" checked={f.useBodyweight} onChange={e=>setF(p=>({...p,useBodyweight:e.target.checked}))} style={{width:18,height:18,accentColor:"#dc2626"}}/>
          Exercice au poids du corps (PDC)
        </label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <button onClick={()=>{if(f.name.trim()){onSave(f);onClose();}}} style={btn(T.text,T.bg,{padding:"12px",fontSize:14})}>✓ Enregistrer</button>
          <button onClick={onClose} style={btn(T.faint,T.dim,{padding:"12px",fontSize:14})}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN APP ───────────────────────────────────────────────────────────── */
export default function App() {
  const [tab,setTab]=useState("seance");
  const [timer,setTimer]=useState(false);
  const [exModal,setExModal]=useState(null);
  const [logEdit,setLogEdit]=useState(null);
  const [exDB,setExDB]=useState(INIT_EX);
  const [plans,setPlans]=useState(INIT_PLANS);
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

  // ── LOAD from storage on mount ──────────────────────────────────────────
  useEffect(()=>{
    (async()=>{
      try {
        const data = await loadData();
        if(data) {
          if(data.logs)  setLogs(data.logs);
          if(data.plans) setPlans(data.plans);
          if(data.exDB)  setExDB(data.exDB);
          if(data.bw!=null) { setBw(data.bw); setBwInput(String(data.bw)); }
        }
      } catch(e){ console.error("Load error",e); }
      setLoaded(true);
    })();
  },[]);

  // ── SAVE whenever data changes (debounced 800ms) ─────────────────────────
  useEffect(()=>{
    if(!loaded) return;
    clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current=setTimeout(async()=>{
      try {
        await saveData({ logs, plans, exDB, bw });
        setSaveStatus("saved");
        setTimeout(()=>setSaveStatus(null),2000);
      } catch(e){ setSaveStatus("error"); console.error("Save error",e); }
    },800);
    return ()=>clearTimeout(saveTimer.current);
  },[logs,plans,exDB,bw,loaded]);

  const today=todayFR();
  const todayPlan=plans[today]||[];
  const todayLogs=logs.filter(l=>l.date===today);

  const addLog=useCallback((entry)=>{
    setLogs(prev=>{const i=prev.findIndex(l=>l.date===entry.date&&l.exo===entry.exo);if(i>=0){const n=[...prev];n[i]=entry;return n;}return[entry,...prev];});
  },[]);
  const updateLog=useCallback((updated)=>{
    setLogs(prev=>prev.map(l=>l.date===updated.date&&l.exo===updated.exo?updated:l));
  },[]);

  const logDates=["Tous",...new Set(logs.map(l=>l.date))].sort((a,b)=>a==="Tous"?-1:frSort(b,a));
  const filteredLogs=useMemo(()=>logs.filter(l=>(!logSearch||l.exo.toLowerCase().includes(logSearch.toLowerCase()))&&(logDate==="Tous"||l.date===logDate)).sort((a,b)=>frSort(b.date,a.date)),[logs,logSearch,logDate]);
  const filteredExDB=useMemo(()=>exDB.filter(e=>e.name.toLowerCase().includes(exSearch.toLowerCase())||e.muscle.toLowerCase().includes(exSearch.toLowerCase())),[exDB,exSearch]);

  const typeColors=Object.entries(TYPE_COLORS);

  const navBtn=(key,label,icon)=>(
    <button key={key} onClick={()=>setTab(key)} style={{flex:1,background:tab===key?T.text:"none",color:tab===key?T.bg:T.dim,border:"none",borderRadius:8,padding:"5px 4px",fontFamily:"'Bebas Neue'",fontSize:11,letterSpacing:.5,cursor:"pointer",transition:"all .15s",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
      <span style={{fontSize:20,lineHeight:1}}>{icon}</span>
      {label}
    </button>
  );

  return(
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Inter',sans-serif",maxWidth:600,margin:"0 auto"}}>
      <style>{FONTS}{`*{box-sizing:border-box;margin:0;padding:0;}::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:${T.border};}input::placeholder{color:${T.faint}!important;}select option{background:${T.card};color:${T.text};}input[type=number]::-webkit-inner-spin-button{opacity:.15;}`}</style>

      {timer&&<Timer onClose={()=>setTimer(false)}/>}
      {exModal&&<ExModal initial={exModal.mode==="edit"?exModal.data:null} onSave={d=>{if(exModal.mode==="edit")setExDB(p=>p.map((e,i)=>i===exModal.idx?{...e,...d}:e));else setExDB(p=>[...p,d]);}} onClose={()=>setExModal(null)} exDB={exDB}/>}
      {logEdit&&<LogEditor log={logEdit} exDB={exDB} onSave={updateLog} onClose={()=>setLogEdit(null)} bw={bw}/>}

      {/* HEADER */}
      <div style={{padding:"14px 16px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:T.bg,zIndex:90,borderBottom:`1px solid ${T.border}`}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:22,letterSpacing:2,lineHeight:1}}>MUSCU</div>
          <div style={{fontSize:10,color:T.faint,fontFamily:"'IBM Plex Mono'"}}>{todayLabel()}</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {/* Bodyweight */}
          {showBwEdit?(
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              <input type="number" value={bwInput} onChange={e=>setBwInput(e.target.value)} style={{...T.inp,width:70,padding:"5px 8px",fontSize:13}}/>
              <button onClick={()=>{setBw(pf(bwInput));setShowBwEdit(false);}} style={btn(T.text,T.bg,{padding:"5px 8px",fontSize:12})}>✓</button>
            </div>
          ):(
            <button onClick={()=>setShowBwEdit(true)} style={{background:T.faint,color:T.dim,border:"none",borderRadius:8,padding:"9px 14px",fontSize:12,cursor:"pointer",fontFamily:"'IBM Plex Mono'"}}>PDC {bw}kg</button>
          )}
          <button onClick={()=>setTimer(true)} style={{background:T.faint,color:T.dim,border:"none",borderRadius:8,padding:"9px 14px",fontSize:14,cursor:"pointer"}}>⏱</button>
          {saveStatus==="saving"&&<span style={{fontSize:9,color:T.faint,fontFamily:"'IBM Plex Mono'"}}>💾…</span>}
          {saveStatus==="saved"&&<span style={{fontSize:9,color:"#16a34a",fontFamily:"'IBM Plex Mono'"}}>✓ sauvé</span>}
          {saveStatus==="error"&&<span style={{fontSize:9,color:"#dc2626",fontFamily:"'IBM Plex Mono'"}}>⚠ erreur</span>}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{paddingTop:14,paddingLeft:14,paddingRight:14,paddingBottom:"calc(90px + env(safe-area-inset-bottom, 0px))"}}>

        {/* ── SÉANCE ── */}
        {tab==="seance"&&(
          <div>
            {/* Type legend */}
            <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
              {typeColors.map(([type,{bg,dim,label}])=>(
                <div key={type} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.dim}}>
                  <div style={{width:10,height:10,borderRadius:2,background:bg}}/>
                  {label}
                </div>
              ))}
            </div>
            <div style={{background:T.card,borderRadius:12,padding:"12px 14px",marginBottom:12,border:`1px solid ${T.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:todayPlan.length>0?8:0}}>
                <div>
                  <div style={{fontWeight:700,fontSize:16,color:T.text}}>Séance du jour</div>
                  <div style={{fontSize:12,color:T.dim,marginTop:2}}>
                    {todayPlan.length>0?<><span style={{color:"#16a34a",fontWeight:700}}>{todayLogs.length}</span>/{todayPlan.length} validés</>:<span style={{color:"#d97706"}}>Aucun plan</span>}
                  </div>
                </div>
                {todayPlan.length===0&&<button onClick={()=>setTab("plan")} style={btn("#dc2626","#fff",{padding:"9px 14px",fontSize:13})}>Planifier →</button>}
              </div>
              {todayPlan.length>0&&(
                <div style={{height:5,background:T.faint,borderRadius:3}}>
                  <div style={{width:`${Math.round(todayLogs.length/todayPlan.length*100)}%`,height:"100%",background:todayLogs.length===todayPlan.length?"#16a34a":"#dc2626",borderRadius:3,transition:"width .4s"}}/>
                </div>
              )}
            </div>
            {todayPlan.length===0?(
              <div style={{textAlign:"center",padding:48,color:T.faint}}>
                <div style={{fontSize:40,marginBottom:10}}>📋</div>
                <div style={{fontSize:14,marginBottom:12}}>Aucun plan pour aujourd'hui</div>
                <button onClick={()=>setTab("plan")} style={btn()}>Créer le plan →</button>
              </div>
            ):(
              todayPlan.map((p,i)=><ExCard key={i} plan={p} exDB={exDB} onLog={addLog} todayLogs={todayLogs} allLogs={logs} bw={bw}/>)
            )}
          </div>
        )}

        {/* ── PLAN ── */}
        {tab==="plan"&&(
          <div>
            <div style={{fontWeight:700,fontSize:18,color:T.text,marginBottom:14}}>Planificateur</div>
            <Planner plans={plans} setPlans={setPlans} exDB={exDB} allLogs={logs} bw={bw}/>
          </div>
        )}

        {/* ── LOGS ── */}
        {tab==="logs"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:18,color:T.text}}>Logs <span style={{color:T.dim,fontWeight:400,fontSize:14}}>({filteredLogs.length})</span></div>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <input value={logSearch} onChange={e=>setLogSearch(e.target.value)} placeholder="🔍 Exercice…" style={{...T.inp,flex:1,fontSize:13}}/>
              <select value={logDate} onChange={e=>setLogDate(e.target.value)} style={{...T.inp,flex:"0 0 130px",fontSize:12,cursor:"pointer"}}>
                {logDates.map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div style={{display:"flex",flexDirection:"column"}}>
              {Object.entries(
                filteredLogs.reduce((acc,log)=>{(acc[log.date]=acc[log.date]||[]).push(log);return acc;},{})
              ).sort((a,b)=>frSort(b[0],a[0])).map(([date,entries])=>{
                const dateVol=entries.reduce((s,l)=>s+(l.volume||0),0);
                return(
                  <div key={date} style={{marginBottom:20}}>
                    {/* Date header */}
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <div style={{flex:1,height:1,background:T.border}}/>
                      <div style={{textAlign:"center",lineHeight:1.2}}>
                        <div style={{fontFamily:"'Bebas Neue'",fontSize:17,letterSpacing:2,color:T.text}}>{dowOf(date)}</div>
                        <div style={{fontFamily:"'IBM Plex Mono'",fontSize:11,color:T.dim,marginTop:2}}>{date} · {dateVol.toFixed(0)} kg</div>
                      </div>
                      <div style={{flex:1,height:1,background:T.border}}/>
                    </div>
                    {/* Entries */}
                    {entries.map((log,i)=>{
                      const ex=exDB.find(e=>e.name===log.exo);
                      const lc=tc(ex?.type||"Push").bg;
                      return(
                        <div key={i} style={{background:T.card,borderLeft:`3px solid ${lc}`,borderRadius:10,padding:"11px 14px",border:`1px solid ${T.border}`,marginBottom:6}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                            <div style={{flex:1,paddingRight:8}}>
                              <div style={{fontWeight:700,fontSize:14,color:T.text}}>{log.exo}</div>
                              {log.note&&<div style={{fontSize:11,color:T.faint,fontFamily:"'IBM Plex Mono'",marginTop:2}}>"{log.note}"</div>}
                            </div>
                            <div style={{display:"flex",gap:8,alignItems:"center"}}>
                              <div style={{fontFamily:"'IBM Plex Mono'",fontWeight:700,color:lc,fontSize:13}}>{(log.volume||0).toFixed(0)} kg</div>
                              <button onClick={()=>setLogEdit(log)} style={{background:"none",border:"none",cursor:"pointer",color:T.dim,fontSize:15,padding:"4px"}}>✏️</button>
                            </div>
                          </div>
                          <div style={{fontFamily:"'IBM Plex Mono'",fontSize:12,color:T.dim}}>
                            {log.series.map((s,j)=><span key={j} style={{marginRight:12}}><span style={{color:T.text,fontWeight:700}}>{s.poids}</span>kg × <span style={{color:T.text,fontWeight:700}}>{s.reps}</span></span>)}
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
            <div style={{fontWeight:700,fontSize:18,color:T.text,marginBottom:14}}>Statistiques</div>
            <Stats logs={logs} exDB={exDB}/>
          </div>
        )}

        {/* ── EXOS ── */}
        {tab==="exos"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:18,color:T.text}}>Exercices <span style={{color:T.dim,fontWeight:400,fontSize:14}}>({filteredExDB.length})</span></div>
              <button onClick={()=>setExModal({mode:"add"})} style={btn("#dc2626","#fff",{padding:"8px 14px",fontSize:13})}>+ Nouveau</button>
            </div>
            {/* Type legend */}
            <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}>
              {typeColors.map(([type,{bg,dim,label,dot}])=>(
                <div key={type} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.dim}}>
                  <div style={{width:10,height:10,borderRadius:2,background:bg}}/>
                  {label}
                </div>
              ))}
            </div>
            <input value={exSearch} onChange={e=>setExSearch(e.target.value)} placeholder="🔍 Rechercher…" style={{...T.inp,marginBottom:12,fontSize:14}}/>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {filteredExDB.map((ex)=>{
                const ec=tc(ex.type).bg;
                const edim=tc(ex.type).dim;
                return(
                  <div key={ex.name} style={{background:T.card,borderLeft:`3px solid ${ec}`,borderRadius:10,padding:"10px 13px",display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${T.border}`}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13,color:T.text}}>{ex.name}</div>
                      <div style={{fontSize:11,color:T.dim,marginTop:2,display:"flex",gap:8}}>
                        <span>{ex.muscle}</span>
                        <span style={{background:edim,color:ec,borderRadius:4,padding:"0px 5px",fontFamily:"'IBM Plex Mono'",fontSize:9,fontWeight:700}}>{ex.type}</span>
                        <span style={{fontFamily:"'IBM Plex Mono'",fontSize:10,color:T.faint}}>×{ex.mult}{ex.barAdd>0?` +${ex.barAdd}kg`:""}{ex.useBodyweight?" PDC":""}</span>
                      </div>
                    </div>
                    <button onClick={()=>setExModal({mode:"edit",idx:exDB.indexOf(ex),data:{...ex}})} style={{background:"none",border:"none",cursor:"pointer",color:T.dim,fontSize:15,padding:"4px 6px"}}>✏️</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:600,background:T.card,borderTop:`1px solid ${T.border}`,display:"flex",zIndex:90,paddingTop:8,paddingLeft:8,paddingRight:8,paddingBottom:"calc(8px + env(safe-area-inset-bottom, 0px))"}}>
        {[["seance","Séance","🏋️"],["plan","Plan","📋"],["logs","Logs","📝"],["stats","Stats","📊"],["exos","Exos","💪"]].map(([k,l,i])=>navBtn(k,l,i))}
      </div>
    </div>
  );
}
