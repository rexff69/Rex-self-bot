import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { loadConfig as loadRpcConfig, saveConfig as saveRpcConfig, setRichPresence } from '../commands/tools/rpc.js';
import { loadReactionData, saveReactionData } from '../functions/autoReaction.js';
import { loadAfk, saveAfk, loadAfkLogs, saveAfkLogs } from '../functions/afk.js';

const __require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB root is one level up from dashboard/
const DB_ROOT = path.join(__dirname, '..', 'database');


export default function initDashboard({ client, lavalink, queueManager, voiceStates }) {
const startTime = new Date();
function getUptime() {
  const s = Math.floor((Date.now() - startTime) / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h}h ${String(m).padStart(2,'0')}m ${String(sec).padStart(2,'0')}s`;
}
function readBody(req) {
  return new Promise(r => { let b = ''; req.on('data', c => b += c); req.on('end', () => r(b)); });
}
function parseForm(body) {
  const o = {};
  for (const p of body.split('&')) {
    const i = p.indexOf('=');
    if (i < 0) continue;
    o[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1).replace(/\+/g, ' '));
  }
  return o;
}
function isCdn(u) { try { return new URL(u).hostname === 'cdn.discordapp.com'; } catch { return false; } }

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#06060a;--surface:#0f0f14;--surface2:#16161d;--surface3:#1d1d26;
  --border:#1f1f2e;--border2:#2a2a3a;
  --accent:#9b6dff;--accent-dim:#7c52d9;--accent-glow:#9b6dff25;
  --green:#3ba55d;--red:#ed4245;--yellow:#faa61a;--blue:#5865f2;
  --text:#e3e3f0;--text2:#9d9dba;--text3:#5c5c7a;
  --radius:10px;--radius-lg:14px;--sidebar:240px;
}
html{height:100%;scroll-behavior:smooth}
body{min-height:100%;background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at 20% 0%,#9b6dff0a 0%,transparent 60%),radial-gradient(ellipse at 80% 100%,#5865f20a 0%,transparent 60%);pointer-events:none;z-index:0}
.app{display:flex;min-height:100vh;position:relative;z-index:1}
a{color:inherit;text-decoration:none}
code{font-family:'JetBrains Mono','Fira Code',monospace;font-size:.78rem;background:var(--surface3);padding:2px 7px;border-radius:4px;color:var(--accent)}

/* ── Sidebar ── */
.sidebar{width:var(--sidebar);flex-shrink:0;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh;z-index:200;transition:transform .25s cubic-bezier(.4,0,.2,1);overflow-y:auto}
.sidebar-brand{padding:20px 18px 16px;border-bottom:1px solid var(--border);flex-shrink:0}
.brand-logo{display:flex;align-items:center;gap:10px}
.brand-icon{width:32px;height:32px;background:linear-gradient(135deg,var(--accent),#5865f2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.9rem;flex-shrink:0;box-shadow:0 0 12px var(--accent-glow)}
.brand-name{font-size:.95rem;font-weight:700;color:#fff;letter-spacing:-.01em}
.brand-sub{font-size:.67rem;color:var(--text3);margin-top:1px}
.nav-section{padding:10px 0 4px}
.nav-label{font-size:.63rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--text3);padding:0 14px 5px}
.nav-item{display:flex;align-items:center;gap:9px;padding:8px 14px;margin:1px 8px;border-radius:var(--radius);font-size:.82rem;font-weight:500;color:var(--text2);transition:.15s;cursor:pointer;border:none;background:none;width:calc(100% - 16px);text-align:left}
.nav-item:hover{color:var(--text);background:var(--surface2)}
.nav-item.active{color:var(--accent);background:var(--accent-glow);font-weight:600}
.nav-item svg{width:15px;height:15px;flex-shrink:0;opacity:.75}
.nav-item.active svg{opacity:1}
.sidebar-footer{margin-top:auto;padding:12px 14px;border-top:1px solid var(--border);flex-shrink:0}
.online-pill{display:flex;align-items:center;gap:8px;background:var(--surface2);border-radius:var(--radius);padding:8px 10px;border:1px solid var(--border)}
.pulse{width:7px;height:7px;border-radius:50%;background:var(--green);flex-shrink:0;position:relative}
.pulse::after{content:'';position:absolute;inset:-3px;border-radius:50%;background:var(--green);opacity:.3;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{transform:scale(1);opacity:.3}50%{transform:scale(1.6);opacity:0}}
.online-text{font-size:.72rem;font-weight:600;color:var(--green)}
.online-name{font-size:.68rem;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* ── Mobile topbar ── */
.topbar{display:none;position:fixed;top:0;left:0;right:0;height:54px;z-index:150;background:var(--surface);border-bottom:1px solid var(--border);align-items:center;padding:0 14px;gap:10px}
.topbar-title{font-weight:700;font-size:.9rem;flex:1;background:linear-gradient(90deg,var(--accent),#5865f2);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.menu-btn{width:34px;height:34px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;color:var(--text2)}
.overlay{display:none;position:fixed;inset:0;background:#00000070;z-index:190;backdrop-filter:blur(3px)}

/* ── Main ── */
.main{margin-left:var(--sidebar);flex:1;display:flex;flex-direction:column;min-height:100vh}
.content{flex:1;padding:30px 32px;max-width:980px;width:100%}
.page-header{margin-bottom:24px}
.page-title{font-size:1.35rem;font-weight:700;color:#fff;letter-spacing:-.02em}
.page-sub{font-size:.8rem;color:var(--text3);margin-top:3px}

/* ── Stats ── */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:20px}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px;transition:.2s;position:relative;overflow:hidden}
.stat-card::before{content:'';position:absolute;top:0;right:0;width:60px;height:60px;border-radius:50%;opacity:.06;transform:translate(15px,-15px)}
.stat-card.c-blue::before{background:#5865f2}.stat-card.c-purple::before{background:#9b6dff}.stat-card.c-green::before{background:#3ba55d}.stat-card.c-yellow::before{background:#faa61a}.stat-card.c-red::before{background:#ed4245}.stat-card.c-teal::before{background:#1abc9c}
.stat-card:hover{border-color:var(--border2);transform:translateY(-1px)}
.stat-icon{font-size:1.1rem;margin-bottom:10px}
.stat-val{font-size:1.3rem;font-weight:700;color:#fff;line-height:1;margin-bottom:3px}
.stat-val.v-purple{color:var(--accent)}.stat-val.v-green{color:var(--green)}.stat-val.v-blue{color:var(--blue)}
.stat-lbl{font-size:.68rem;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--text3)}

/* ── Cards ── */
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);margin-bottom:14px;overflow:hidden}
.card-head{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px}
.card-head-left{display:flex;align-items:center;gap:9px}
.card-icon-sm{width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:.75rem;flex-shrink:0}
.card-title{font-size:.8rem;font-weight:600;color:var(--text)}
.card-body{padding:18px}
.card-body.no-pad{padding:0}
.card-footer{padding:12px 18px;border-top:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-wrap:wrap}

/* ── 2-col grid ── */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.three-col{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}

/* ── Forms ── */
.form-group{margin-bottom:12px}
.form-group:last-child{margin-bottom:0}
.label{display:block;font-size:.73rem;font-weight:600;color:var(--text2);margin-bottom:5px;letter-spacing:.01em}
.hint{font-size:.68rem;color:var(--text3);margin-top:3px}
input[type=text],input[type=url],input[type=number],input[type=password],select,textarea{width:100%;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius);padding:9px 11px;color:var(--text);font-size:.83rem;font-family:inherit;outline:none;transition:.15s;-webkit-appearance:none}
input:focus,select:focus,textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow)}
input::placeholder,textarea::placeholder{color:var(--text3)}
select{cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235c5c7a' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 9px center;padding-right:28px}
select option{background:var(--surface2)}
textarea{resize:vertical;min-height:90px;line-height:1.5}

/* ── Toggle ── */
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--border)}
.toggle-row:last-child{border-bottom:none;padding-bottom:0}
.toggle-row:first-child{padding-top:0}
.toggle-info{flex:1;min-width:0;margin-right:14px}
.toggle-label{font-size:.85rem;font-weight:500;color:var(--text)}
.toggle-desc{font-size:.73rem;color:var(--text3);margin-top:1px}
.switch{position:relative;width:40px;height:22px;flex-shrink:0}
.switch input{opacity:0;width:0;height:0;position:absolute}
.switch-track{position:absolute;inset:0;background:var(--border2);border-radius:22px;cursor:pointer;transition:.2s}
.switch-track::before{content:'';position:absolute;width:16px;height:16px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px #0006}
input:checked+.switch-track{background:var(--accent)}
input:checked+.switch-track::before{transform:translateX(18px)}

/* ── Buttons ── */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 16px;border-radius:var(--radius);font-size:.8rem;font-weight:600;cursor:pointer;border:none;transition:.15s;white-space:nowrap;font-family:inherit}
.btn svg{width:13px;height:13px}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:var(--accent-dim);transform:translateY(-1px);box-shadow:0 4px 14px var(--accent-glow)}
.btn-primary:active{transform:none}
.btn-danger{background:var(--red);color:#fff}
.btn-danger:hover{background:#c93535}
.btn-ghost{background:transparent;border:1px solid var(--border2);color:var(--text2)}
.btn-ghost:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-glow)}
.btn-success{background:var(--green);color:#fff}
.btn-success:hover{background:#2d9048}
.btn-sm{padding:6px 12px;font-size:.76rem}
.btn-full{width:100%;justify-content:center;padding:11px}
.btn:disabled{opacity:.45;cursor:not-allowed;transform:none!important;box-shadow:none!important}

/* ── Badges ── */
.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:4px;font-size:.68rem;font-weight:600;letter-spacing:.02em}
.badge-green{background:#3ba55d18;color:var(--green)}.badge-red{background:#ed424518;color:var(--red)}.badge-blue{background:#5865f218;color:var(--blue)}.badge-purple{background:var(--accent-glow);color:var(--accent)}.badge-gray{background:var(--surface2);color:var(--text2)}

/* ── Info rows ── */
.info-list{display:flex;flex-direction:column}
.info-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);gap:10px}
.info-row:last-child{border-bottom:none;padding-bottom:0}
.info-row:first-child{padding-top:0}
.info-key{font-size:.77rem;color:var(--text3);font-weight:500;flex-shrink:0}
.info-val{font-size:.8rem;color:var(--text);font-weight:500;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:62%}

/* ── Table ── */
.table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
table{width:100%;border-collapse:collapse;font-size:.8rem;min-width:380px}
th{padding:9px 14px;color:var(--text3);font-weight:600;font-size:.68rem;text-transform:uppercase;letter-spacing:.07em;border-bottom:1px solid var(--border);text-align:left;white-space:nowrap}
td{padding:11px 14px;border-bottom:1px solid #0f0f18;color:var(--text);vertical-align:middle}
tr:last-child td{border-bottom:none}
tbody tr:hover td{background:#ffffff03}

/* ── Alert ── */
.alert{padding:10px 14px;border-radius:var(--radius);font-size:.8rem;margin-bottom:14px;display:flex;align-items:center;gap:8px;border:1px solid transparent;position:relative}
.alert-success{background:#3ba55d12;border-color:#3ba55d28;color:var(--green)}
.alert-error{background:#ed424512;border-color:#ed424528;color:var(--red)}
.alert-info{background:var(--accent-glow);border-color:#9b6dff28;color:var(--accent)}

/* ── Music player ── */
.music-grid{display:grid;grid-template-columns:1fr 320px;gap:16px}
.player-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:28px;display:flex;flex-direction:column;align-items:center;text-align:center;min-height:420px}
.track-art{width:200px;height:200px;border-radius:14px;object-fit:cover;margin-bottom:20px;box-shadow:0 8px 30px #0006;transition:.4s}
.track-art.spinning{box-shadow:0 0 30px var(--accent-glow),0 8px 30px #0006}
.track-title{font-size:1.1rem;font-weight:700;color:#fff;max-width:90%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px}
.track-artist{font-size:.85rem;color:var(--text3);margin-bottom:18px}
.progress-wrap{width:100%;max-width:320px;display:flex;align-items:center;gap:10px;margin-bottom:16px}
.time-txt{font-size:.72rem;color:var(--text3);font-family:monospace;min-width:38px}
.progress-bar{flex:1;height:5px;background:var(--border2);border-radius:5px;overflow:hidden;cursor:pointer}
.progress-fill{height:100%;background:var(--accent);width:0%;border-radius:5px;transition:width .5s linear}
.controls{display:flex;align-items:center;gap:14px;margin-bottom:12px}
.ctrl-btn{width:48px;height:48px;border-radius:50%;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;border:1px solid var(--border2);background:var(--surface2);color:var(--text2);transition:.15s}
.ctrl-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-glow);transform:scale(1.08)}
.ctrl-btn.stop:hover{border-color:var(--red);color:var(--red);background:#ed424518}
.ctrl-btn svg{width:18px;height:18px;fill:currentColor}
.queue-list-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);display:flex;flex-direction:column;overflow:hidden}
.queue-list-head{padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:.8rem;font-weight:600}
.queue-scroll{overflow-y:auto;flex:1;max-height:370px}
.q-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #0f0f18;transition:.1s}
.q-item:last-child{border-bottom:none}
.q-item:hover{background:#ffffff03}
.q-img{width:38px;height:38px;border-radius:6px;object-fit:cover;flex-shrink:0;background:var(--border)}
.q-info{flex:1;min-width:0}
.q-title{font-size:.8rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.q-auth{font-size:.72rem;color:var(--text3)}
.q-num{font-size:.72rem;color:var(--text3);width:20px;flex-shrink:0}
.join-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:32px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:300px;gap:14px}
.join-title{font-size:1.2rem;font-weight:700;color:#fff}
.join-desc{font-size:.83rem;color:var(--text3);max-width:280px}

/* ── RPC preview ── */
.rpc-preview{background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius);padding:14px 16px;display:flex;gap:14px;align-items:flex-start}
.rpc-img-box{width:64px;height:64px;border-radius:8px;object-fit:cover;flex-shrink:0;background:var(--border);display:flex;align-items:center;justify-content:center;font-size:1.6rem;overflow:hidden}
.rpc-img-box img{width:100%;height:100%;object-fit:cover;border-radius:8px}
.rpc-type-lbl{font-size:.67rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text3);margin-bottom:5px}
.rpc-name{font-weight:700;font-size:.95rem;color:#fff}
.rpc-details{font-size:.8rem;color:var(--text2);margin-top:1px}
.rpc-state{font-size:.8rem;color:var(--text2)}
.rpc-btns{display:flex;gap:7px;margin-top:8px;flex-wrap:wrap}
.rpc-btn-pill{font-size:.7rem;padding:4px 10px;border:1px solid var(--border2);border-radius:4px;color:var(--text2);background:var(--surface)}

/* ── AFK logs ── */
.log-item{display:flex;align-items:flex-start;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--border);gap:10px}
.log-item:last-child{border-bottom:none}
.log-user{font-size:.8rem;font-weight:600;color:var(--accent)}
.log-msg{font-size:.78rem;color:var(--text2);margin-top:2px}
.log-meta{font-size:.72rem;color:var(--text3);margin-top:2px}
.log-link{color:var(--accent);font-size:.72rem}

/* ── Reaction triggers ── */
.trigger-item{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border);gap:10px}
.trigger-item:last-child{border-bottom:none}
.trigger-name{font-size:.83rem;font-weight:600;color:var(--text)}
.trigger-emojis{font-size:.8rem;color:var(--accent);margin-top:2px;word-break:break-all}

/* ── Commands ── */
.cmd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:20px}
.cmd-feature-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:22px 20px;cursor:pointer;transition:.2s;display:flex;flex-direction:column;gap:10px}
.cmd-feature-card:hover{border-color:var(--accent);background:var(--surface2);transform:translateY(-2px);box-shadow:0 8px 24px #0005}
.cmd-feature-icon{font-size:1.6rem}
.cmd-feature-name{font-size:.95rem;font-weight:700;color:#fff}
.cmd-feature-desc{font-size:.78rem;color:var(--text3);line-height:1.4}

/* ── Terminal ── */
.terminal-win{background:#03030a;border:1px solid var(--accent);border-radius:10px;overflow:hidden;box-shadow:0 0 20px var(--accent-glow)}
.terminal-head{background:#0d0d14;padding:9px 14px;border-bottom:1px solid #1a1a2e;display:flex;justify-content:space-between;align-items:center}
.terminal-title{font-family:monospace;font-size:.78rem;color:var(--text3)}
.terminal-body{padding:12px 14px;height:360px;overflow-y:auto;font-family:'JetBrains Mono','Fira Code',monospace;font-size:.78rem;line-height:1.5;color:#0dbc79}
.log-line{margin-bottom:2px;word-wrap:break-word}

/* ── Responsive ── */
@media(max-width:900px){.three-col{grid-template-columns:1fr 1fr}.music-grid{grid-template-columns:1fr}}
@media(max-width:680px){
  .sidebar{transform:translateX(-100%)}.sidebar.open{transform:translateX(0)}
  .overlay.open{display:block}.topbar{display:flex}.main{margin-left:0}
  .content{padding:62px 14px 22px}.stats-grid{grid-template-columns:repeat(2,1fr)}
  .two-col,.three-col{grid-template-columns:1fr}.music-grid{grid-template-columns:1fr}
  .rpc-preview{flex-direction:column;align-items:center;text-align:center}
}
@media(max-width:380px){.stats-grid{grid-template-columns:1fr}.btn{padding:7px 12px}}
`;

// ─── Layout ──────────────────────────────────────────────────────────────────
function icon(d, a = '') { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${a}>${d}</svg>`; }

const NAV = [
  { id:'home',     href:'/',           label:'Overview',      i:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',  section:'MAIN' },
  { id:'rpc',      href:'/rpc',        label:'Rich Presence', i:'<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',                                section:'MAIN' },
  { id:'ai',       href:'/ai',         label:'AI Chat',       i:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',                            section:'MAIN' },
  { id:'afk',      href:'/afk',        label:'AFK System',    i:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',section:'MAIN' },
  { id:'reaction', href:'/reaction',   label:'Auto Reaction', i:'<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>', section:'MAIN' },
  { id:'music',    href:'/music',      label:'Music Player',  i:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',               section:'FEATURES' },
  { id:'cloner',   href:'/cloner',     label:'Server Cloner', i:'<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>', section:'FEATURES' },
  { id:'quests',   href:'/quests',     label:'Quest Terminal',i:'<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',                              section:'FEATURES' },
  { id:'commands', href:'/commands',   label:'Commands',      i:'<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',                                   section:'SYSTEM' },
  { id:'settings', href:'/settings',   label:'Settings',      i:'<circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>',section:'SYSTEM'},
];

function layout(active, title, content, flash = '') {
  const user = client.user;
  const sections = {};
  for (const n of NAV) {
    if (!sections[n.section]) sections[n.section] = [];
    sections[n.section].push(n);
  }
  const navHtml = Object.entries(sections).map(([sec, items]) => `
    <div class="nav-section">
      <div class="nav-label">${sec}</div>
      ${items.map(n => `<a href="${n.href}" class="nav-item${active===n.id?' active':''}">${icon(n.i)} ${n.label}</a>`).join('')}
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="theme-color" content="#0f0f14"/>
<title>${title} — Neonix</title>
<style>${CSS}</style>
</head><body>
<div class="app">
  <div class="topbar">
    <button class="menu-btn" onclick="toggleMenu()">${icon('<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>')}</button>
    <span class="topbar-title">✦ Neonix</span>
  </div>
  <div class="overlay" id="overlay" onclick="toggleMenu()"></div>
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-brand">
      <div class="brand-logo">
        <div class="brand-icon">✦</div>
        <div><div class="brand-name">Neonix</div><div class="brand-sub">Selfbot Dashboard</div></div>
      </div>
    </div>
    ${navHtml}
    <div class="sidebar-footer">
      <div class="online-pill">
        <div class="pulse"></div>
        <div><div class="online-text">Online</div><div class="online-name">${user?.username ?? 'Connecting...'}</div></div>
      </div>
    </div>
  </aside>
  <div class="main"><div class="content">
    ${flash}
    ${content}
  </div></div>
</div>
<script>
function toggleMenu(){document.getElementById('sidebar').classList.toggle('open');document.getElementById('overlay').classList.toggle('open');}
document.querySelectorAll('.nav-item').forEach(el=>el.addEventListener('click',()=>{if(window.innerWidth<=680){document.getElementById('sidebar').classList.remove('open');document.getElementById('overlay').classList.remove('open');}}));
setTimeout(()=>{const a=document.querySelector('.alert');if(a){a.style.transition='opacity .4s';a.style.opacity='0';setTimeout(()=>a.remove(),400);}},3000);
</script>
</body></html>`;
}

function flashAlert(type, msg) {
  if (!msg) return '';
  return `<div class="alert alert-${type}">${msg}</div>`;
}

// ─── Page: Overview ───────────────────────────────────────────────────────────
function pageHome() {
  const rpc = loadRpcConfig();
  const afk = loadAfk();
  const aiCfgPath = path.join(DB_ROOT, 'ai_config.json');
  let aiEnabled = 0;
  try { aiEnabled = Object.values(JSON.parse(fs.readFileSync(aiCfgPath,'utf8'))).filter(c=>c.enabled).length; } catch {}
  const rxn = loadReactionData();

  const stats = [
    { cls:'c-purple', icon:'👤', val:client.user?.username??'—', lbl:'Account', vcls:'v-purple' },
    { cls:'c-blue',   icon:'🌐', val:client.guilds?.cache?.size??0, lbl:'Servers', vcls:'v-blue' },
    { cls:'c-green',  icon:'⚡', val:client.commands?.size??0, lbl:'Commands', vcls:'v-green' },
    { cls:'c-yellow', icon:'⏱️', val:getUptime(), lbl:'Uptime', vcls:'v-green' },
    { cls:'c-teal',   icon:'🤖', val:aiEnabled, lbl:'AI Guilds' },
    { cls:'c-red',    icon:'💬', val:afk.isOn?'ON':'OFF', lbl:'AFK', vcls:afk.isOn?'v-green':'' },
  ];

  const statsHtml = stats.map(s=>`<div class="stat-card ${s.cls}"><div class="stat-icon">${s.icon}</div><div class="stat-val ${s.vcls||''}">${s.val}</div><div class="stat-lbl">${s.lbl}</div></div>`).join('');

  const infoRows = [
    ['User ID', client.user?.id??'—'],
    ['Prefix', process.env.PREFIX||'!'],
    ['Owner ID', process.env.OWNER_ID||'—'],
    ['Node.js', process.version],
    ['Memory', `${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB`],
    ['PID', process.pid],
    ['AI Providers', [process.env.GROQ_API_KEY?'Groq':'',process.env.HUGGINGFACE_API_KEY?'HF':'',process.env.NVIDIA_NIM_API_KEY?'NIM':''].filter(Boolean).join(', ')||'None'],
  ];

  return layout('home', 'Overview', `
<div class="page-header"><div class="page-title">Overview</div><div class="page-sub">Live status for your Neonix selfbot</div></div>
<div class="stats-grid">${statsHtml}</div>
<div class="two-col">
  <div class="card">
    <div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#9b6dff18">⚙️</div><span class="card-title">Bot Info</span></div></div>
    <div class="card-body"><div class="info-list">${infoRows.map(([k,v])=>`<div class="info-row"><span class="info-key">${k}</span><span class="info-val">${v}</span></div>`).join('')}</div></div>
  </div>
  <div class="card">
    <div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#3ba55d18">📡</div><span class="card-title">System Status</span></div></div>
    <div class="card-body"><div class="info-list">
      <div class="info-row"><span class="info-key">Discord</span><span class="badge badge-green">● Connected</span></div>
      <div class="info-row"><span class="info-key">RPC</span><span class="badge ${rpc.enabled?'badge-green':'badge-gray'}">${rpc.enabled?'● Active':'Off'}</span></div>
      <div class="info-row"><span class="info-key">AFK System</span><span class="badge ${afk.isOn?'badge-green':'badge-gray'}">${afk.isOn?'● On':'Off'}</span></div>
      <div class="info-row"><span class="info-key">Auto Reaction</span><span class="badge ${rxn.global?'badge-purple':'badge-gray'}">${rxn.global?'● Global':'Whitelist'}</span></div>
      <div class="info-row"><span class="info-key">Dashboard</span><span class="badge badge-green">● Port 3000</span></div>
      <div class="info-row"><span class="info-key">No-Prefix Mode</span><span class="badge ${client.db?.noPrefixMode?'badge-green':'badge-gray'}">${client.db?.noPrefixMode?'On':'Off'}</span></div>
    </div></div>
  </div>
</div>`);
}

// ─── Page: RPC ────────────────────────────────────────────────────────────────
function pageRPC(flash = '') {
  const cfg = loadRpcConfig();
  const types = ['PLAYING','STREAMING','LISTENING','WATCHING','COMPETING'];
  const previewImg = cfg.imageUrl ? `<img src="${cfg.imageUrl}" alt="" onerror="this.style.display='none'">` : '🎮';

  return layout('rpc', 'Rich Presence', `
<div class="page-header"><div class="page-title">Rich Presence</div><div class="page-sub">Configure your Discord activity. Only cdn.discordapp.com image links accepted.</div></div>
<div class="card"><div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#9b6dff18">👁️</div><span class="card-title">Preview</span></div><span class="badge ${cfg.enabled?'badge-green':'badge-gray'}">${cfg.enabled?'● Active':'Disabled'}</span></div>
<div class="card-body">
  <div class="rpc-preview">
    <div class="rpc-img-box">${previewImg}</div>
    <div>
      <div class="rpc-type-lbl">${cfg.type||'PLAYING'}</div>
      <div class="rpc-name">${cfg.name||'Activity Name'}</div>
      ${cfg.details?`<div class="rpc-details">${cfg.details}</div>`:''}
      ${cfg.state?`<div class="rpc-state">${cfg.state}</div>`:''}
      ${(cfg.button1Label||cfg.button2Label)?`<div class="rpc-btns">${cfg.button1Label?`<div class="rpc-btn-pill">${cfg.button1Label}</div>`:''} ${cfg.button2Label?`<div class="rpc-btn-pill">${cfg.button2Label}</div>`:''}</div>`:''}
    </div>
  </div>
</div></div>
<form method="POST" action="/rpc">
<div class="card"><div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#3ba55d18">⚡</div><span class="card-title">Activity</span></div></div>
<div class="card-body">
  <div class="toggle-row" style="margin-bottom:14px;border:none;padding:0">
    <div class="toggle-info"><div class="toggle-label">Enable RPC</div><div class="toggle-desc">Show on your Discord profile</div></div>
    <label class="switch"><input type="checkbox" name="enabled" value="1" ${cfg.enabled?'checked':''}><span class="switch-track"></span></label>
  </div>
  <div class="two-col">
    <div class="form-group"><label class="label">Type</label><select name="type">${types.map(t=>`<option value="${t}" ${cfg.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
    <div class="form-group"><label class="label">Name *</label><input type="text" name="name" value="${cfg.name||''}" placeholder="e.g. Minecraft"/></div>
  </div>
  <div class="two-col">
    <div class="form-group"><label class="label">Details (line 2)</label><input type="text" name="details" value="${cfg.details||''}" placeholder="e.g. Survival Mode"/></div>
    <div class="form-group"><label class="label">State (line 3)</label><input type="text" name="state" value="${cfg.state||''}" placeholder="e.g. In a game"/></div>
  </div>
</div></div>
<div class="card"><div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#faa61a18">🖼️</div><span class="card-title">Images</span></div><span class="badge badge-purple">cdn.discordapp.com only</span></div>
<div class="card-body">
  <div class="two-col">
    <div class="form-group"><label class="label">Large Image URL</label><input type="url" name="imageUrl" value="${cfg.imageUrl||''}" placeholder="https://cdn.discordapp.com/..."/></div>
    <div class="form-group"><label class="label">Large Image Tooltip</label><input type="text" name="imageText" value="${cfg.imageText||''}" placeholder="Hover text"/></div>
  </div>
  <div class="two-col">
    <div class="form-group"><label class="label">Small Image URL</label><input type="url" name="smallImageUrl" value="${cfg.smallImageUrl||''}" placeholder="https://cdn.discordapp.com/..."/></div>
    <div class="form-group"><label class="label">Small Image Tooltip</label><input type="text" name="smallImageText" value="${cfg.smallImageText||''}" placeholder="Hover text"/></div>
  </div>
</div></div>
<div class="card"><div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#5865f218">🔘</div><span class="card-title">Buttons <span style="font-weight:400;color:var(--text3)">(optional)</span></span></div></div>
<div class="card-body">
  <div class="two-col">
    <div class="form-group"><label class="label">Button 1 Label</label><input type="text" name="button1Label" value="${cfg.button1Label||''}" placeholder="Visit Website"/></div>
    <div class="form-group"><label class="label">Button 1 URL</label><input type="url" name="button1Url" value="${cfg.button1Url||''}" placeholder="https://..."/></div>
  </div>
  <div class="two-col">
    <div class="form-group"><label class="label">Button 2 Label</label><input type="text" name="button2Label" value="${cfg.button2Label||''}" placeholder="Source Code"/></div>
    <div class="form-group"><label class="label">Button 2 URL</label><input type="url" name="button2Url" value="${cfg.button2Url||''}" placeholder="https://..."/></div>
  </div>
</div></div>
<div style="display:flex;gap:10px;flex-wrap:wrap">
  <button type="submit" class="btn btn-primary">💾 Save &amp; Apply</button>
  <a href="/rpc/clear" class="btn btn-ghost btn-sm">Clear Activity</a>
</div>
</form>`, flashAlert('success', flash));
}

// ─── Page: AI ─────────────────────────────────────────────────────────────────
function pageAI(flash = '') {
  const aiCfgPath = path.join(DB_ROOT, 'ai_config.json');
  let aiCfg = {};
  try { aiCfg = JSON.parse(fs.readFileSync(aiCfgPath,'utf8')); } catch {}
  const personalityPath = path.join(DB_ROOT, 'personality.txt');
  let personality = '';
  try { personality = fs.readFileSync(personalityPath,'utf8'); } catch {}
  const PROVIDERS = {groq:'Groq',huggingface:'HuggingFace',nim:'NVIDIA NIM'};
  const keyStatus = (k, label) => `<div class="info-row"><span class="info-key">${label}</span><span class="badge ${process.env[k]?'badge-green':'badge-gray'}">${process.env[k]?'● Set':'Not set'}</span></div>`;

  return layout('ai', 'AI Chat', `
<div class="page-header"><div class="page-title">AI Chat</div><div class="page-sub">Manage AI personality and guild configurations</div></div>
<div class="two-col" style="margin-bottom:14px">
  <div class="card" style="margin-bottom:0"><div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#3ba55d18">🔑</div><span class="card-title">API Keys</span></div></div>
  <div class="card-body"><div class="info-list">${keyStatus('GROQ_API_KEY','Groq')}${keyStatus('HUGGINGFACE_API_KEY','HuggingFace')}${keyStatus('NVIDIA_NIM_API_KEY','NVIDIA NIM')}</div><div class="hint" style="margin-top:10px">Keys are set in <code>.env</code></div></div></div>
  <div class="card" style="margin-bottom:0"><div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#9b6dff18">📊</div><span class="card-title">Stats</span></div></div>
  <div class="card-body"><div class="info-list">
    <div class="info-row"><span class="info-key">Total Guilds</span><span class="info-val">${Object.keys(aiCfg).length}</span></div>
    <div class="info-row"><span class="info-key">Enabled</span><span class="info-val">${Object.values(aiCfg).filter(c=>c.enabled).length}</span></div>
    <div class="info-row"><span class="info-key">Providers in use</span><span class="info-val">${[...new Set(Object.values(aiCfg).map(c=>PROVIDERS[c.provider]||'Groq'))].join(', ')||'—'}</span></div>
  </div></div></div>
</div>
<form method="POST" action="/ai">
<div class="card"><div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#faa61a18">✏️</div><span class="card-title">System Prompt / Personality</span></div></div>
<div class="card-body"><div class="form-group"><label class="label">System Prompt</label><textarea name="personality" rows="6" placeholder="You are a helpful assistant...">${personality.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea><div class="hint">Sent as system message to all AI providers</div></div></div>
<div class="card-footer"><button type="submit" class="btn btn-primary btn-sm">💾 Save Personality</button></div></div>
</form>
<div class="card"><div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#5865f218">🌐</div><span class="card-title">Guild Configurations</span></div></div>
<div class="card-body no-pad"><div class="table-wrap"><table>
  <thead><tr><th>Guild ID</th><th>Status</th><th>Provider</th><th>Channels</th><th>Scope</th></tr></thead>
  <tbody>${Object.entries(aiCfg).map(([gId,cfg])=>`<tr><td><code>${gId}</code></td><td><span class="badge ${cfg.enabled?'badge-green':'badge-red'}">${cfg.enabled?'On':'Off'}</span></td><td>${PROVIDERS[cfg.provider]||cfg.provider||'Groq'}</td><td>${cfg.channels?.length??0}</td><td><span class="badge badge-blue">${cfg.respondToAll?'Everyone':'Owner'}</span></td></tr>`).join('')||`<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:22px">No guilds configured. Use <code>ai on</code> in Discord first.</td></tr>`}</tbody>
</table></div></div>
<div class="card-footer"><span style="font-size:.73rem;color:var(--text3)">Use <code>ai provider &lt;groq/hf/nim&gt;</code> in Discord to change per-guild provider</span></div></div>`, flashAlert('success', flash));
}

// ─── Page: AFK ────────────────────────────────────────────────────────────────
function pageAFK(flash = '') {
  const afk = loadAfk();
  const logs = loadAfkLogs();
  const logRows = logs.length ? logs.map(l => `
    <div class="log-item">
      <div>
        <div class="log-user">${l.user}</div>
        <div class="log-msg">"${l.content}"</div>
        <div class="log-meta">${l.time} · ${l.guild} #${l.channel} · <a href="${l.link}" target="_blank" class="log-link">Jump</a></div>
      </div>
      <a href="/afk/deletelog?id=${l.id}" class="btn btn-danger btn-sm">✕</a>
    </div>`).join('') : '<div style="text-align:center;color:var(--text3);padding:22px">No mentions logged yet.</div>';

  return layout('afk', 'AFK System', `
<div class="page-header"><div class="page-title">AFK System</div><div class="page-sub">Auto-reply to mentions when you're away and log who messaged you</div></div>
<form method="POST" action="/afk/save">
<div class="card"><div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#9b6dff18">😴</div><span class="card-title">AFK Settings</span></div><span class="badge ${afk.isOn?'badge-green':'badge-gray'}">${afk.isOn?'● Active':'Off'}</span></div>
<div class="card-body">
  <div class="toggle-row">
    <div class="toggle-info"><div class="toggle-label">Enable AFK Mode</div><div class="toggle-desc">Auto-reply when someone mentions you</div></div>
    <label class="switch"><input type="checkbox" name="isOn" value="1" ${afk.isOn?'checked':''}><span class="switch-track"></span></label>
  </div>
  <div class="toggle-row">
    <div class="toggle-info"><div class="toggle-label">Log Mentions</div><div class="toggle-desc">Save who mentioned you while AFK</div></div>
    <label class="switch"><input type="checkbox" name="logsEnabled" value="1" ${afk.logsEnabled?'checked':''}><span class="switch-track"></span></label>
  </div>
  <div class="form-group" style="margin-top:14px"><label class="label">AFK Message</label><input type="text" name="reason" value="${afk.reason||''}" placeholder="I am currently AFK."/></div>
</div>
<div class="card-footer"><button type="submit" class="btn btn-primary btn-sm">💾 Save Settings</button></div></div>
</form>
<div class="card"><div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#5865f218">📬</div><span class="card-title">Mention Logs</span></div><a href="/afk/clearlogs" class="btn btn-danger btn-sm">Clear All</a></div>
<div class="card-body">${logRows}</div></div>`, flashAlert('success', flash));
}

// ─── Page: Auto Reaction ──────────────────────────────────────────────────────
function pageReaction(flash = '') {
  const rxn = loadReactionData();
  const textRows = Object.entries(rxn.textTriggers||{}).map(([t,e]) => `
    <div class="trigger-item">
      <div><div class="trigger-name">"${t}"</div><div class="trigger-emojis">${e.join(' ')}</div></div>
      <a href="/reaction/delete?type=text&key=${encodeURIComponent(t)}" class="btn btn-danger btn-sm">Remove</a>
    </div>`).join('') || '<div style="text-align:center;color:var(--text3);padding:16px">No text triggers</div>';
  const userRows = Object.entries(rxn.userTriggers||{}).map(([u,e]) => `
    <div class="trigger-item">
      <div><div class="trigger-name"><code>${u}</code></div><div class="trigger-emojis">${e.join(' ')}</div></div>
      <a href="/reaction/delete?type=user&key=${encodeURIComponent(u)}" class="btn btn-danger btn-sm">Remove</a>
    </div>`).join('') || '<div style="text-align:center;color:var(--text3);padding:16px">No user triggers</div>';

  return layout('reaction', 'Auto Reaction', `
<div class="page-header"><div class="page-title">Auto Reaction</div><div class="page-sub">Automatically react to messages based on keywords or user IDs</div></div>
<form method="POST" action="/reaction/save">
<div class="card"><div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#faa61a18">⚙️</div><span class="card-title">Global Settings</span></div></div>
<div class="card-body">
  <div class="toggle-row">
    <div class="toggle-info"><div class="toggle-label">Global Mode</div><div class="toggle-desc">React in all servers (if off, only whitelisted)</div></div>
    <label class="switch"><input type="checkbox" name="global" value="1" ${rxn.global?'checked':''}><span class="switch-track"></span></label>
  </div>
</div>
<div class="card-footer"><button type="submit" class="btn btn-primary btn-sm">💾 Save</button></div></div>
</form>
<form method="POST" action="/reaction/addtrigger">
<div class="card"><div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#3ba55d18">➕</div><span class="card-title">Add Trigger</span></div></div>
<div class="card-body">
  <div class="three-col">
    <div class="form-group"><label class="label">Type</label><select name="type"><option value="text">Text / Keyword</option><option value="user">User ID</option></select></div>
    <div class="form-group"><label class="label">Trigger</label><input type="text" name="trigger" placeholder="Keyword or User ID" required/></div>
    <div class="form-group"><label class="label">Emojis (space-separated)</label><input type="text" name="emojis" placeholder="🔥 💯 ❤️" required/></div>
  </div>
</div>
<div class="card-footer"><button type="submit" class="btn btn-primary btn-sm">Add Trigger</button></div></div>
</form>
<div class="two-col">
  <div class="card"><div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#9b6dff18">📝</div><span class="card-title">Text Triggers</span></div></div>
  <div class="card-body no-pad">${textRows}</div></div>
  <div class="card"><div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#5865f218">👤</div><span class="card-title">User Triggers</span></div></div>
  <div class="card-body no-pad">${userRows}</div></div>
</div>`, flashAlert('success', flash));
}

// ─── Page: Music ──────────────────────────────────────────────────────────────
function pageMusic() {
  return layout('music', 'Music Player', `
<div class="page-header"><div class="page-title">Music Player</div><div class="page-sub">Live music control — join a voice channel and play songs directly from the dashboard</div></div>
<div id="joinView">
  <div class="join-card">
    <div style="font-size:2.5rem">🎵</div>
    <div class="join-title">Join a Voice Channel</div>
    <div class="join-desc">Select a server and voice channel to start listening</div>
    <div class="form-group" style="width:100%;max-width:320px">
      <label class="label">Server</label>
      <select id="serverSel" onchange="loadChannels()" style="margin-bottom:10px"><option value="">Select server...</option></select>
      <label class="label">Voice Channel</label>
      <select id="channelSel"><option value="">Select channel...</option></select>
    </div>
    <button class="btn btn-primary" onclick="joinVC()">Join Voice</button>
  </div>
</div>
<div id="playerView" style="display:none">
  <div class="music-grid">
    <div class="player-card">
      <img id="trackArt" src="" class="track-art" onerror="this.src='https://i.imgur.com/2ce2t5e.png'"/>
      <div id="trackTitle" class="track-title">Nothing playing</div>
      <div id="trackArtist" class="track-artist">—</div>
      <div class="progress-wrap">
        <span id="currTime" class="time-txt">0:00</span>
        <div class="progress-bar"><div id="progressFill" class="progress-fill"></div></div>
        <span id="totalTime" class="time-txt">0:00</span>
      </div>
      <div class="controls">
        <button class="ctrl-btn" onclick="prevSong()" title="Previous"><svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg></button>
        <button class="ctrl-btn stop" onclick="stopMusic()" title="Stop"><svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg></button>
        <button class="ctrl-btn" onclick="skipSong()" title="Skip"><svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-ghost btn-sm" onclick="openPlayModal()">▶ Add Song</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="leaveVC()">Leave VC</button>
      </div>
    </div>
    <div class="queue-list-card">
      <div class="queue-list-head"><span>Queue</span><span class="badge badge-purple" id="queueCount">0</span></div>
      <div class="queue-scroll" id="queueList"><div style="text-align:center;color:var(--text3);padding:22px">Queue is empty</div></div>
    </div>
  </div>
</div>
<!-- Play Modal -->
<div id="playModal" style="display:none;position:fixed;inset:0;background:#00000080;z-index:1000;align-items:center;justify-content:center;backdrop-filter:blur(4px)">
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;width:460px;max-width:92vw">
    <div style="font-size:1rem;font-weight:700;margin-bottom:16px">Play / Add Song</div>
    <div class="form-group"><input type="text" id="playInput" placeholder="Song name or URL..." onkeydown="if(event.key==='Enter')playSong()"/></div>
    <div style="display:flex;gap:10px">
      <button class="btn btn-primary" id="playBtn" onclick="playSong()">Play / Add</button>
      <button class="btn btn-ghost" onclick="closePlayModal()">Cancel</button>
    </div>
  </div>
</div>
<script>
let currentGuildId = null;
function fmt(ms){if(!ms||isNaN(ms))return'0:00';const s=Math.max(0,Math.floor(ms/1000)),m=Math.floor(s/60);return m+':'+(s%60+'').padStart(2,'0');}
async function loadServers(){const r=await fetch('/api/discord/guilds');const g=await r.json();const s=document.getElementById('serverSel');s.innerHTML='<option value="">Select server...</option>';g.forEach(x=>s.innerHTML+=\`<option value="\${x.id}">\${x.name}</option>\`);}
async function loadChannels(){const gId=document.getElementById('serverSel').value;const s=document.getElementById('channelSel');if(!gId){s.innerHTML='<option value="">Select channel...</option>';return;}s.innerHTML='<option>Loading...</option>';const r=await fetch('/api/discord/channels/'+gId);const c=await r.json();s.innerHTML='<option value="">Select channel...</option>';c.forEach(x=>s.innerHTML+=\`<option value="\${x.id}">\${x.name}</option>\`);}
async function joinVC(){const gId=document.getElementById('serverSel').value,cId=document.getElementById('channelSel').value;if(!gId||!cId)return alert('Select server and channel');await fetch('/api/music/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guildId:gId,channelId:cId})});currentGuildId=gId;setTimeout(updateState,1500);}
async function leaveVC(){if(!currentGuildId)return;await fetch('/api/music/leave',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guildId:currentGuildId})});currentGuildId=null;}
function openPlayModal(){document.getElementById('playModal').style.display='flex';setTimeout(()=>document.getElementById('playInput').focus(),50);}
function closePlayModal(){document.getElementById('playModal').style.display='none';}
async function playSong(){const q=document.getElementById('playInput').value.trim();if(!q)return;if(!currentGuildId)return alert('Join a voice channel first');const btn=document.getElementById('playBtn');btn.textContent='Adding...';btn.disabled=true;try{const r=await fetch('/api/music/play',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guildId:currentGuildId,query:q})});const d=await r.json();if(d.success){document.getElementById('playInput').value='';closePlayModal();}else alert('Error: '+(d.message||'Failed'));}catch(e){alert('Network error');}finally{btn.textContent='Play / Add';btn.disabled=false;}}
async function skipSong(){await fetch('/api/music/skip',{method:'POST'});}
async function prevSong(){await fetch('/api/music/previous',{method:'POST'});}
async function stopMusic(){if(confirm('Stop music and clear queue?'))await fetch('/api/music/stop',{method:'POST'});}
async function updateState(){
  try{
    const r=await fetch('/api/music/status');const d=await r.json();
    if(d.isPlaying||d.isConnectedToVoice){
      document.getElementById('joinView').style.display='none';
      document.getElementById('playerView').style.display='block';
      currentGuildId=d.activeGuildId||currentGuildId;
      if(d.nowPlaying){
        document.getElementById('trackArt').src=d.nowPlaying.cover;
        document.getElementById('trackTitle').textContent=d.nowPlaying.title;
        document.getElementById('trackArtist').textContent=d.nowPlaying.author;
        const pct=d.duration?Math.min(100,(d.position/d.duration)*100):0;
        document.getElementById('progressFill').style.width=pct+'%';
        document.getElementById('currTime').textContent=fmt(d.position);
        document.getElementById('totalTime').textContent=fmt(d.duration);
        document.getElementById('queueCount').textContent=d.queueCount||0;
        const ql=document.getElementById('queueList');
        if(d.queue&&d.queue.length>0){ql.innerHTML=d.queue.map((s,i)=>\`<div class="q-item"><span class="q-num">\${i+1}</span><img class="q-img" src="\${s.cover}" onerror="this.src='https://i.imgur.com/2ce2t5e.png'"/><div class="q-info"><div class="q-title">\${s.title}</div><div class="q-auth">\${s.author}</div></div></div>\`).join('');}
        else ql.innerHTML='<div style="text-align:center;color:var(--text3);padding:20px">Queue is empty</div>';
      }
    }else{
      document.getElementById('joinView').style.display='block';
      document.getElementById('playerView').style.display='none';
      currentGuildId=null;
      if(document.getElementById('serverSel').children.length<=1)loadServers();
    }
  }catch(e){}
}
setInterval(updateState,1500);updateState();
</script>`);
}

// ─── Page: Server Cloner ─────────────────────────────────────────────────────
function pageCloner() {
  return layout('cloner', 'Server Cloner', `
<div class="page-header"><div class="page-title">Server Cloner</div><div class="page-sub">Replicate server structures. Requires admin/owner in target server.</div></div>
<div class="card"><div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#faa61a18">⚙️</div><span class="card-title">Configuration</span></div></div>
<div class="card-body">
  <div class="two-col" style="margin-bottom:16px">
    <div class="form-group">
      <label class="label">Source Server ID</label>
      <input type="text" id="srcId" placeholder="Source Guild ID" onblur="fetchGuild('src')"/>
      <div id="srcPreview" style="display:none;margin-top:8px"></div>
    </div>
    <div class="form-group">
      <label class="label">Target Server ID</label>
      <input type="text" id="tgtId" placeholder="Target Guild ID" onblur="fetchGuild('tgt')"/>
      <div id="tgtPreview" style="display:none;margin-top:8px"></div>
    </div>
  </div>
  <div style="font-size:.78rem;font-weight:600;color:var(--text2);margin-bottom:12px;text-transform:uppercase;letter-spacing:.06em">Clone Options</div>
  <div class="two-col">
    ${[['delChannels','Delete Existing Channels',true],['delRoles','Delete Existing Roles',true],['delEmojis','Delete Existing Emojis',false],['cloneChannels','Clone Channels',true],['cloneRoles','Clone Roles',true],['cloneEmojis','Clone Emojis',false]].map(([id,lbl,def])=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--surface2);border-radius:8px;border:1px solid var(--border)">
      <span style="font-size:.82rem;color:var(--text)">${lbl}</span>
      <label class="switch"><input type="checkbox" id="${id}" ${def?'checked':''}><span class="switch-track"></span></label>
    </div>`).join('')}
  </div>
</div>
<div class="card-footer"><button id="startBtn" class="btn btn-primary" disabled onclick="startCloning()">🚀 Start Cloning</button></div></div>
<div class="card"><div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#3ba55d18">📟</div><span class="card-title">Live Progress</span></div></div>
<div class="card-body no-pad">
  <div class="terminal-body" id="clonerConsole" style="height:280px;border-radius:0 0 12px 12px">
    <div class="log-line" style="color:var(--text3)">Waiting for process to start...</div>
  </div>
</div></div>
<script>
let srcOk=false,tgtOk=false,cloning=false,logsSeen=0;
async function fetchGuild(type){
  const id=document.getElementById(type+'Id').value;
  const prev=document.getElementById(type+'Preview');
  if(!id||id.length<17){prev.style.display='none';if(type==='src')srcOk=false;else tgtOk=false;checkBtn();return;}
  prev.style.display='block';prev.innerHTML='<span style="color:var(--text3);font-size:.78rem">Checking...</span>';
  try{
    const r=await fetch('/api/cloner/fetch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guildId:id})});
    const d=await r.json();
    if(d.success){
      const perm=type==='tgt'?(d.isAdmin||d.isOwner?'<span class="badge badge-green">✓ Permission OK</span>':'<span class="badge badge-red">✕ No Admin</span>'):'';
      if(type==='tgt'){tgtOk=d.isAdmin||d.isOwner;}else{srcOk=true;}
      prev.innerHTML=\`<div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--surface2);border-radius:8px;border:1px solid var(--border)"><img src="\${d.icon||'https://cdn.discordapp.com/embed/avatars/0.png'}" style="width:32px;height:32px;border-radius:50%"/><div><div style="font-size:.82rem;font-weight:600">\${d.name}</div>\${perm}</div></div>\`;
    }else{if(type==='src')srcOk=false;else tgtOk=false;prev.innerHTML=\`<span style="color:var(--red);font-size:.78rem">\${d.message}</span>\`;}
  }catch(e){prev.innerHTML='<span style="color:var(--red);font-size:.78rem">Error</span>';}
  checkBtn();
}
function checkBtn(){document.getElementById('startBtn').disabled=!(srcOk&&tgtOk&&!cloning);}
function appendLog(txt){const c=document.getElementById('clonerConsole');const d=document.createElement('div');d.className='log-line';d.textContent=txt;if(txt.includes('Error'))d.style.color='#ff5f5f';else if(txt.includes('complete')||txt.includes('Done'))d.style.color='#faa61a';c.appendChild(d);c.scrollTop=c.scrollHeight;if(c.children.length>300)c.removeChild(c.firstChild);}
async function startCloning(){
  if(!srcOk||!tgtOk)return;if(!confirm('This will modify the target server. Proceed?'))return;
  const opts={deleteChannels:document.getElementById('delChannels').checked,deleteRoles:document.getElementById('delRoles').checked,deleteEmojis:document.getElementById('delEmojis').checked,cloneChannels:document.getElementById('cloneChannels').checked,cloneRoles:document.getElementById('cloneRoles').checked,cloneEmojis:document.getElementById('cloneEmojis').checked};
  cloning=true;checkBtn();document.getElementById('startBtn').textContent='Cloning...';
  const r=await fetch('/api/cloner/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sourceId:document.getElementById('srcId').value,targetId:document.getElementById('tgtId').value,options:opts})});
  pollCloner();
}
async function pollCloner(){
  try{const r=await fetch('/api/cloner/status');const d=await r.json();
  if(d.logs.length>logsSeen){d.logs.slice(logsSeen).forEach(appendLog);logsSeen=d.logs.length;}
  if(d.isRunning){setTimeout(pollCloner,1500);}else{cloning=false;document.getElementById('startBtn').textContent='🚀 Start Cloning';checkBtn();}}catch(e){setTimeout(pollCloner,3000);}
}
pollCloner();
</script>`);
}

// ─── Page: Quests ─────────────────────────────────────────────────────────────
function pageQuests() {
  return layout('quests', 'Quest Terminal', `
<div class="page-header"><div class="page-title">Quest Terminal</div><div class="page-sub">Auto-complete Discord quests</div></div>
<div class="card"><div class="card-head">
  <div class="card-head-left"><div class="card-icon-sm" style="background:#3ba55d18">🖥️</div><span class="card-title">Terminal</span></div>
  <div style="display:flex;gap:8px">
    <button class="btn btn-success btn-sm" id="btnStart" onclick="startQuests()">▶ Start All</button>
    <button class="btn btn-danger btn-sm" id="btnStop" onclick="stopQuests()">■ Stop All</button>
    <button class="btn btn-ghost btn-sm" onclick="clearTerm()">Clear</button>
  </div>
</div>
<div class="card-body no-pad">
  <div class="terminal-win" style="border:none;border-radius:0 0 12px 12px">
    <div class="terminal-head"><span class="terminal-title">neonix@quests:~$ ./complete_all</span></div>
    <div class="terminal-body" id="termOut"><div class="log-line" style="color:var(--text3)">Ready. Click START ALL to begin.</div></div>
  </div>
</div></div>
<script>
const term=document.getElementById('termOut');
let seen=new Set(),autoScroll=true;
term.addEventListener('scroll',()=>{autoScroll=term.scrollHeight-term.scrollTop<=term.clientHeight+50;});
function appendLog(txt){if(seen.has(txt))return;seen.add(txt);const d=document.createElement('div');d.className='log-line';d.textContent=txt;if(txt.includes('Error'))d.style.color='#ff5f5f';else if(txt.includes('COMPLETED'))d.style.color='#faa61a';else if(txt.includes('Spoof')||txt.includes('spoof'))d.style.color='#00d4ff';term.appendChild(d);if(autoScroll)term.scrollTop=term.scrollHeight;if(term.children.length>500)term.removeChild(term.firstChild);}
async function startQuests(){appendLog('> Starting...');try{await fetch('/quest/start-all',{method:'POST'});}catch(e){appendLog('> Error: '+e.message);}}
async function stopQuests(){appendLog('> Stopping...');try{await fetch('/quest/stop-all',{method:'POST'});}catch(e){}}
async function clearTerm(){term.innerHTML='';seen.clear();try{await fetch('/quest/clear-logs',{method:'POST'});}catch(e){}}
async function poll(){
  try{const r=await fetch('/api/quests');const d=await r.json();
  document.getElementById('btnStart').disabled=d.isRunning;document.getElementById('btnStop').disabled=!d.isRunning;
  if(d.logs)d.logs.slice().reverse().forEach(appendLog);}catch(e){}
}
setInterval(poll,1000);
</script>`);
}

// ─── Page: Commands ───────────────────────────────────────────────────────────
function pageCommands() {
  const categories = new Map();
  for (const [, cmd] of (client.commands ?? new Map())) {
    const cat = cmd.category || 'misc';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat).push(cmd);
  }
  const catIcons = {music:'🎵',ai:'🤖',fun:'🎉',fun2:'🎪',moderation:'🔨',tools:'🔧',utility:'⚙️',misc:'📦'};

  return layout('commands', 'Commands', `
<div class="page-header"><div class="page-title">Commands</div><div class="page-sub">${client.commands?.size??0} commands across ${categories.size} categories</div></div>
${[...categories.entries()].map(([cat,cmds])=>`
<div class="card">
  <div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:var(--surface2)">${catIcons[cat]||'📦'}</div><span class="card-title">${cat.charAt(0).toUpperCase()+cat.slice(1)} <span style="font-weight:400;color:var(--text3)">(${cmds.length})</span></span></div></div>
  <div class="card-body no-pad"><div class="table-wrap"><table>
    <thead><tr><th>Command</th><th>Aliases</th><th>Description</th><th>Usage</th></tr></thead>
    <tbody>${cmds.map(c=>`<tr><td><code>${process.env.PREFIX||'!'}${c.name}</code></td><td style="color:var(--text3)">${c.aliases?.join(', ')||'—'}</td><td style="color:var(--text2)">${c.description||'—'}</td><td><code style="font-size:.72rem">${c.usage||c.name}</code></td></tr>`).join('')}</tbody>
  </table></div></div>
</div>`).join('') || '<div class="alert alert-info">No commands loaded yet.</div>'}`);
}

// ─── Page: Settings ───────────────────────────────────────────────────────────
function pageSettings(flash = '') {
  const allowedPath = path.join(DB_ROOT, 'allowedUsers.json');
  let allowed = [];
  try { allowed = JSON.parse(fs.readFileSync(allowedPath,'utf8')).allowedUsers||[]; } catch {}

  return layout('settings', 'Settings', `
<div class="page-header"><div class="page-title">Settings</div><div class="page-sub">Manage allowed users and bot configuration</div></div>
<div class="card"><div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#3ba55d18">👥</div><span class="card-title">Allowed Users</span></div><span class="badge badge-blue">${allowed.length} users</span></div>
<div class="card-body no-pad"><div class="table-wrap"><table>
  <thead><tr><th>#</th><th>User ID</th><th>Action</th></tr></thead>
  <tbody>${allowed.length?allowed.map((uid,i)=>`<tr><td style="color:var(--text3)">${i+1}</td><td><code>${uid}</code></td><td><a href="/settings/removeuser?id=${uid}" class="btn btn-danger btn-sm">Remove</a></td></tr>`).join(''):`<tr><td colspan="3" style="text-align:center;color:var(--text3);padding:20px">No allowed users added yet</td></tr>`}</tbody>
</table></div></div>
<div class="card-footer">
  <form method="POST" action="/settings/adduser" style="display:flex;gap:8px;flex:1;flex-wrap:wrap">
    <input type="text" name="userId" placeholder="Discord User ID (17-20 digits)" style="flex:1;min-width:180px"/>
    <button type="submit" class="btn btn-primary btn-sm">Add User</button>
  </form>
</div></div>
<div class="card"><div class="card-head"><div class="card-head-left"><div class="card-icon-sm" style="background:#9b6dff18">⚙️</div><span class="card-title">Bot Configuration</span></div></div>
<div class="card-body"><div class="info-list">
  <div class="info-row"><span class="info-key">Prefix</span><code>${process.env.PREFIX||'!'}</code></div>
  <div class="info-row"><span class="info-key">Owner ID</span><code>${process.env.OWNER_ID||'Not set'}</code></div>
  <div class="info-row"><span class="info-key">No-Prefix Mode</span><span class="badge ${client.db?.noPrefixMode?'badge-green':'badge-gray'}">${client.db?.noPrefixMode?'● Enabled':'Disabled'}</span></div>
  <div class="info-row"><span class="info-key">Lavalink</span><code>${process.env.LAVALINK_REST||'Not configured'}</code></div>
</div><div class="hint" style="margin-top:12px">Prefix and owner are configured in <code>.env</code></div></div></div>
`, flashAlert('success', flash));
}

// ─── Music API helpers ────────────────────────────────────────────────────────
function getMusicStatus() {
  const queues = queueManager.getAll();
  const base = { connected:!!lavalink, isPlaying:false, isConnectedToVoice:false, activeGuildId:null, guildName:'', guildIcon:null, channelName:'', nowPlaying:null, position:0, duration:0, queue:[], queueCount:0 };

  for (const [guildId, queue] of queues) {
    if (!queue.nowPlaying) continue;
    const guild = client.guilds.cache.get(guildId);
    const info = queue.nowPlaying.info;
    let cover = 'https://i.imgur.com/2ce2t5e.png';
    if (info.sourceName === 'youtube' || info.uri?.includes('youtube')) cover = `https://img.youtube.com/vi/${info.identifier}/maxresdefault.jpg`;
    else if (info.artworkUrl) cover = info.artworkUrl;

    let pos = queue.position || 0;
    if (queue.lastUpdate && !queue.paused) { pos += Date.now() - queue.lastUpdate; if (pos > info.length) pos = info.length; }

    return { ...base, isPlaying:true, activeGuildId:guildId, guildName:guild?.name||`Guild ${guildId}`, guildIcon:guild?.iconURL({dynamic:true,size:128})||null,
      nowPlaying:{ title:info.title, author:info.author, cover, url:info.uri },
      position:pos, duration:info.length,
      queue:queue.songs.map(s=>({ title:s.info.title, author:s.info.author, uri:s.info.uri, cover:s.info.artworkUrl||'https://i.imgur.com/2ce2t5e.png' })),
      queueCount:queue.songs.length };
  }
  // Check if connected but idle
  for (const [guildId, guild] of client.guilds.cache) {
    if (voiceStates[guildId]?.channelId) {
      return { ...base, isConnectedToVoice:true, activeGuildId:guildId, guildName:guild.name, guildIcon:guild.iconURL({dynamic:true,size:128}) };
    }
  }
  return base;
}

// ─── Cloner state ─────────────────────────────────────────────────────────────
const clonerState = { isRunning:false, logs:[], stats:{} };

// ─── Router ───────────────────────────────────────────────────────────────────
http.createServer(async (req, res) => {
  const rawUrl = req.url || '/';
  const url = rawUrl.split('?')[0];
  const qs = Object.fromEntries(new URLSearchParams(rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?')+1) : ''));
  const method = req.method;

  const send = (html, code=200) => { res.writeHead(code,{'Content-Type':'text/html;charset=utf-8'}); res.end(html); };
  const sendJson = (data, code=200) => { res.writeHead(code,{'Content-Type':'application/json'}); res.end(JSON.stringify(data)); };
  const redirect = loc => { res.writeHead(302,{Location:loc}); res.end(); };

  // ── POST /rpc ──
  if (method==='POST' && url==='/rpc') {
    const form = parseForm(await readBody(req));
    const cfg = loadRpcConfig();
    Object.assign(cfg, {
      enabled: form.enabled==='1', type: form.type||'PLAYING', name: form.name?.trim()||null,
      details: form.details?.trim()||null, state: form.state?.trim()||null,
      imageText: form.imageText?.trim()||null, smallImageText: form.smallImageText?.trim()||null,
      button1Label: form.button1Label?.trim()||null, button1Url: form.button1Url?.trim()||null,
      button2Label: form.button2Label?.trim()||null, button2Url: form.button2Url?.trim()||null,
      imageUrl: isCdn(form.imageUrl?.trim()) ? form.imageUrl.trim() : null,
      smallImageUrl: isCdn(form.smallImageUrl?.trim()) ? form.smallImageUrl.trim() : null,
    });
    saveRpcConfig(cfg); try { await setRichPresence(client, cfg); } catch {}
    return send(pageRPC('RPC settings saved and applied ✓'));
  }
  if (method==='GET' && url==='/rpc/clear') {
    const cfg = loadRpcConfig(); cfg.enabled=false; saveRpcConfig(cfg); try { await setRichPresence(client,cfg); } catch {}
    return redirect('/rpc');
  }

  // ── POST /ai ──
  if (method==='POST' && url==='/ai') {
    const form = parseForm(await readBody(req));
    if (form.personality !== undefined) fs.writeFileSync(path.join(DB_ROOT, 'personality.txt'), form.personality);
    return send(pageAI('Personality saved ✓'));
  }

  // ── POST /afk ──
  if (method==='POST' && url==='/afk/save') {
    const form = parseForm(await readBody(req));
    saveAfk({ isOn: form.isOn==='1', reason: form.reason?.trim()||'I am currently AFK.', logsEnabled: form.logsEnabled==='1' });
    return redirect('/afk');
  }
  if (method==='GET' && url==='/afk/deletelog') {
    const logs = loadAfkLogs().filter(l => l.id !== qs.id); saveAfkLogs(logs); return redirect('/afk');
  }
  if (method==='GET' && url==='/afk/clearlogs') { saveAfkLogs([]); return redirect('/afk'); }

  // ── Reaction ──
  if (method==='POST' && url==='/reaction/save') {
    const form = parseForm(await readBody(req));
    const rxn = loadReactionData(); rxn.global = form.global==='1'; saveReactionData(rxn);
    return redirect('/reaction');
  }
  if (method==='POST' && url==='/reaction/addtrigger') {
    const form = parseForm(await readBody(req));
    const rxn = loadReactionData();
    const emojis = (form.emojis||'').split(/\s+/).filter(Boolean);
    if (form.type==='text') { if (!rxn.textTriggers) rxn.textTriggers={}; rxn.textTriggers[form.trigger] = emojis; }
    else { if (!rxn.userTriggers) rxn.userTriggers={}; rxn.userTriggers[form.trigger] = emojis; }
    saveReactionData(rxn); return redirect('/reaction');
  }
  if (method==='GET' && url==='/reaction/delete') {
    const rxn = loadReactionData();
    if (qs.type==='text') delete rxn.textTriggers[qs.key];
    else delete rxn.userTriggers[qs.key];
    saveReactionData(rxn); return redirect('/reaction');
  }

  // ── Settings ──
  if (method==='POST' && url==='/settings/adduser') {
    const form = parseForm(await readBody(req));
    const uid = form.userId?.trim();
    if (uid && /^\d{17,20}$/.test(uid)) {
      const p = path.join(DB_ROOT, 'allowedUsers.json');
      let d = {allowedUsers:[]}; try { d = JSON.parse(fs.readFileSync(p,'utf8')); } catch {}
      if (!d.allowedUsers.includes(uid)) { d.allowedUsers.push(uid); fs.writeFileSync(p, JSON.stringify(d,null,2)); }
      return send(pageSettings('User added ✓'));
    }
    return send(pageSettings('Invalid user ID'));
  }
  if (method==='GET' && url==='/settings/removeuser') {
    const p = path.join(DB_ROOT, 'allowedUsers.json');
    let d = {allowedUsers:[]}; try { d = JSON.parse(fs.readFileSync(p,'utf8')); } catch {}
    d.allowedUsers = d.allowedUsers.filter(u=>u!==qs.id);
    fs.writeFileSync(p, JSON.stringify(d,null,2)); return redirect('/settings');
  }

  // ── API: Validate ──
  if (method==='POST' && url==='/api/validate/guild') {
    const body = JSON.parse(await readBody(req));
    const guild = client.guilds.cache.get(body.id);
    if (!guild) return sendJson({error:'Server not found'},404);
    return sendJson({id:guild.id,name:guild.name,icon:guild.iconURL({dynamic:true})||''});
  }
  if (method==='POST' && url==='/api/validate/channel') {
    const body = JSON.parse(await readBody(req));
    const ch = client.channels.cache.get(body.id);
    if (!ch) return sendJson({error:'Channel not found'},404);
    return sendJson({id:ch.id,name:ch.name,guildName:ch.guild?.name||'DM',guildIcon:ch.guild?.iconURL({dynamic:true})||''});
  }
  if (method==='POST' && url==='/api/validate/user') {
    const body = JSON.parse(await readBody(req));
    try { const u = await client.users.fetch(body.id); return sendJson({id:u.id,username:u.username,avatar:u.displayAvatarURL({dynamic:true})}); }
    catch { return sendJson({error:'User not found'},404); }
  }

  // ── API: Music ──
  if (method==='GET' && url==='/api/music/status') return sendJson(getMusicStatus());
  if (method==='POST' && url==='/api/music/join') {
    const b = JSON.parse(await readBody(req));
    client.ws.broadcast({op:4,d:{guild_id:b.guildId,channel_id:b.channelId,self_mute:false,self_deaf:false}});
    return sendJson({success:true});
  }
  if (method==='POST' && url==='/api/music/leave') {
    const b = JSON.parse(await readBody(req));
    queueManager.delete(b.guildId); if (lavalink) await lavalink.destroyPlayer(b.guildId).catch(()=>{});
    if (voiceStates[b.guildId]) delete voiceStates[b.guildId];
    client.ws.broadcast({op:4,d:{guild_id:b.guildId,channel_id:null,self_mute:false,self_deaf:false}});
    return sendJson({success:true});
  }
  if (method==='POST' && url==='/api/music/stop') {
    let stopped=false;
    for (const [gId, queue] of queueManager.getAll()) {
      if (queue.nowPlaying) {
        if (lavalink) await lavalink.destroyPlayer(gId).catch(()=>{});
        queueManager.delete(gId); stopped=true;
      }
    }
    return sendJson({success:stopped});
  }
  if (method==='POST' && url==='/api/music/skip') {
    for (const [gId, queue] of queueManager.getAll()) {
      if (!queue.nowPlaying) continue;
      const next = queueManager.getNext(gId);
      if (!next) { if (lavalink) await lavalink.destroyPlayer(gId).catch(()=>{}); queueManager.delete(gId); }
      else {
        if (queue.history) queue.history.push(queue.nowPlaying);
        queue.nowPlaying = next; queue.position=0; queue.lastUpdate=Date.now();
        const vs = voiceStates[gId];
        if (vs && lavalink) await lavalink.updatePlayer(gId, next, vs).catch(()=>{});
      }
      return sendJson({success:true});
    }
    return sendJson({success:false,message:'No music playing'});
  }
  if (method==='POST' && url==='/api/music/previous') {
    for (const [gId, queue] of queueManager.getAll()) {
      if (!queue.nowPlaying || !queue.history?.length) continue;
      const prev = queue.history.pop();
      queue.songs.unshift(queue.nowPlaying); queue.nowPlaying=prev; queue.position=0; queue.lastUpdate=Date.now();
      const vs = voiceStates[gId];
      if (vs && lavalink) await lavalink.updatePlayer(gId, prev, vs).catch(()=>{});
      return sendJson({success:true});
    }
    return sendJson({success:false,message:'No history'});
  }
  if (method==='POST' && url==='/api/music/play') {
    const b = JSON.parse(await readBody(req));
    if (!b.guildId || !b.query) return sendJson({success:false,message:'Missing args'});
    try {
      const identifier = /^(https?:\/\/|www\.)/i.test(b.query) ? b.query : `ytmsearch:${b.query}`;
      const result = await lavalink.loadTracks(identifier);
      if (result.loadType==='empty') return sendJson({success:false,message:'No results'});
      let track;
      if (result.loadType==='track') track=result.data;
      else if (result.loadType==='search') track=result.data[0];
      else if (result.loadType==='playlist') track=result.data.tracks[0];
      if (!track) return sendJson({success:false,message:'No track found'});
      let queue = queueManager.get(b.guildId);
      if (!queue) { queue = queueManager.create(b.guildId); }
      if (queue.nowPlaying) { queueManager.addSong(b.guildId, track); return sendJson({success:true,queued:true}); }
      const vs = voiceStates[b.guildId];
      if (!vs?.channelId) return sendJson({success:false,message:'Not in voice channel'});
      queue.nowPlaying=track; queue.position=0; queue.lastUpdate=Date.now();
      await lavalink.updatePlayer(b.guildId, track, vs, {volume:queue.volume,filters:queue.filters});
      return sendJson({success:true,queued:false});
    } catch (e) { return sendJson({success:false,message:e.message}); }
  }
  if (method==='GET' && url==='/api/discord/guilds') {
    return sendJson([...client.guilds.cache.values()].map(g=>({id:g.id,name:g.name,icon:g.iconURL()})));
  }
  if (method==='GET' && url.startsWith('/api/discord/channels/')) {
    const guildId = url.split('/').pop();
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return sendJson([]);
    return sendJson([...guild.channels.cache.values()].filter(c=>c.type==='GUILD_VOICE'||c.type==='GUILD_STAGE_VOICE').map(c=>({id:c.id,name:c.name})));
  }

  // ── API: Reaction ──
  if (method==='GET' && url==='/api/reaction') {
    const d = loadReactionData();
    const enrichServers = (d.enabledServers||[]).map(id=>{const g=client.guilds.cache.get(id);return{id,name:g?g.name:'Unknown',icon:g?g.iconURL({dynamic:true}):'https://cdn.discordapp.com/embed/avatars/0.png'};});
    const enrichChannels = (d.enabledChannels||[]).map(id=>{const c=client.channels.cache.get(id);return{id,name:c?c.name:'Unknown',guildName:c?.guild?.name||'Unknown',guildIcon:c?.guild?.iconURL({dynamic:true})||'https://cdn.discordapp.com/embed/avatars/0.png'};});
    return sendJson({...d,enrichedServers:enrichServers,enrichedChannels:enrichChannels});
  }
  if (method==='POST' && url==='/api/reaction') {
    const b = JSON.parse(await readBody(req)); saveReactionData(b); return sendJson({success:true});
  }

  // ── API: Logs ──
  if (method==='GET' && url==='/api/logs') return sendJson(loadAfkLogs());

  // ── API: Cloner ──
  if (method==='GET' && url==='/api/cloner/status') return sendJson({isRunning:clonerState.isRunning,logs:clonerState.logs,stats:clonerState.stats});
  if (method==='POST' && url==='/api/cloner/fetch') {
    const b = JSON.parse(await readBody(req));
    const guild = client.guilds.cache.get(b.guildId);
    if (!guild) return sendJson({success:false,message:'Guild not found'});
    const member = await guild.members.fetch(client.user.id).catch(()=>null);
    const isAdmin = member ? member.permissions.has('ADMINISTRATOR') : false;
    return sendJson({success:true,name:guild.name,icon:guild.iconURL({dynamic:true,size:128})||'',isAdmin,isOwner:guild.ownerId===client.user.id});
  }
  if (method==='POST' && url==='/api/cloner/start') {
    if (clonerState.isRunning) return sendJson({success:false,message:'Already running'});
    const {sourceId,targetId,options} = JSON.parse(await readBody(req));
    clonerState.isRunning=true; clonerState.logs=[]; clonerState.stats={};
    clonerState.logs.push(`[${new Date().toLocaleTimeString()}] Initializing...`);
    const ServerCloner = __require('../cloner/ServerCloner.cjs');
    const cloner = new ServerCloner(client, msg => {
      clonerState.logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      if (clonerState.logs.length>500) clonerState.logs.shift();
    });
    cloner.cloneServer(sourceId, targetId, options)
      .then(stats => { clonerState.stats=stats; clonerState.isRunning=false; clonerState.logs.push(`[${new Date().toLocaleTimeString()}] Completed.`); })
      .catch(err => { clonerState.isRunning=false; clonerState.logs.push(`[${new Date().toLocaleTimeString()}] Error: ${err.message}`); });
    return sendJson({success:true});
  }

  // ── API: Quests ──
  if (method==='GET' && url==='/api/quests') {
    if (!client._questManager) return sendJson({logs:[],isRunning:false});
    return sendJson({logs:client._questManager.globalLogs,isRunning:client._questManager.isRunning});
  }
  if (method==='POST' && url==='/quest/start-all') {
    if (client._questManager) client._questManager.startAll();
    return sendJson({success:true});
  }
  if (method==='POST' && url==='/quest/stop-all') {
    if (client._questManager) client._questManager.stopAll();
    return sendJson({success:true});
  }
  if (method==='POST' && url==='/quest/clear-logs') {
    if (client._questManager) client._questManager.clearLogs();
    return sendJson({success:true});
  }

  // ── GET pages ──
  const pages = {
    '/': pageHome, '/rpc': pageRPC, '/ai': pageAI,
    '/afk': pageAFK, '/reaction': pageReaction,
    '/music': pageMusic, '/cloner': pageCloner,
    '/quests': pageQuests, '/commands': pageCommands, '/settings': pageSettings,
  };
  if (pages[url]) return send(pages[url]());
  redirect('/');

}).listen(3000, () => console.log('[Dashboard] http://localhost:3000'));

// ── Initialize Quests ─────────────────────────────────────────────────────────
try {
  const QuestManager = __require('../quests/manager.cjs');
  const token = process.env.TOKEN;
  if (token) {
    client._questManager = new QuestManager(token);
    console.log('[Quests] Quest manager initialized');
  }
} catch (e) { console.warn('[Quests] Quest manager not available:', e.message); }

}
