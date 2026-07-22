import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Dimensions, Easing, KeyboardAvoidingView, Modal, Platform,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Defs, LinearGradient as SvgLG, RadialGradient as SvgRG, Stop,
  Circle, Path, Rect, G as SvgG, Line,
} from 'react-native-svg';
const { buildReportMarkdown, reportFileName } = require('./src/report-export');
const { publicCostStatus } = require('./src/cost-policy');

const { width } = Dimensions.get('window');
const APP_WIDTH = Platform.OS === 'web' ? Math.min(width, 430) : width;

/* ============================================================
 * Web 平台 Alert 兜底（RN 在 Web 不渲染 Alert）
 * ============================================================ */
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title, message, buttons) => {
    const text = String(title || '') + (message ? '\n\n' + message : '');
    if (!buttons || buttons.length <= 1) {
      try { window.alert(text); } catch (e) {}
      const cb = buttons && buttons[0] && buttons[0].onPress; if (cb) cb();
      return;
    }
    let ok = true; try { ok = window.confirm(text); } catch (e) { ok = true; }
    const cancel = buttons.find((b) => b.style === 'cancel') || buttons[0];
    const confirmBtn = buttons.find((b) => b.style === 'destructive')
      || buttons.find((b) => !b.style && b.onPress)
      || buttons[buttons.length - 1];
    const chosen = ok ? confirmBtn : cancel;
    if (chosen && chosen.onPress) chosen.onPress();
  };
}

/* ============================================================
 * Storage 兜底层：localStorage 被拒（iframe / 隐私模式）时落到内存
 * ============================================================ */
const _memStore = new Map();
const Storage = {
  async getItem(key) {
    try { const v = await AsyncStorage.getItem(key); if (v != null) return v; } catch (e) {}
    return _memStore.has(key) ? _memStore.get(key) : null;
  },
  async setItem(key, value) {
    _memStore.set(key, value);
    try { await AsyncStorage.setItem(key, value); } catch (e) {}
  },
  async removeItem(key) {
    _memStore.delete(key);
    try { await AsyncStorage.removeItem(key); } catch (e) {}
  },
  async multiRemove(keys) {
    keys.forEach((k) => _memStore.delete(k));
    try { await AsyncStorage.multiRemove(keys); } catch (e) {}
  },
};

function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
const now = new Date();
const today = formatLocalDate(now);
const todayWeekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];
const dateLabel = `${now.getMonth() + 1}月${now.getDate()}日`;
const hour = now.getHours();
const greeting = hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 13 ? '中午好' : hour < 18 ? '下午好' : '晚上好';

/* ============================================================
 * 设计系统 v4 ——「Editorial Health」
 * 暖米色底 + 深松绿主色 + 珊瑚红辅 + 真 SVG 图形 + 杂志感排版
 * ============================================================ */
const C = {
  // 温润薄荷沙骨架（柔和适老/患者友好，介于冷调与暖调之间）
  bg: '#EEF3EF',
  bgSoft: '#F6F9F6',
  surface: '#FFFFFF',
  surfaceWarm: '#FFFFFF',     // Hero 卡用纯白
  surfaceMuted: '#E9EFEA',    // 输入框 / 迷你指标行 / 信息格
  paper: '#F1F5F2',
  ink: '#1F2A38',             // 软化的墨蓝（不用 slate-900 的硬黑）
  inkSoft: '#3D4A5C',
  muted: '#6F7C8C',
  faint: '#A6AFC0',
  border: '#DEE6E2',          // 薄荷沙色发丝描边
  borderSoft: '#E7ECE7',
  divider: '#E8EEEA',

  primary: '#0C7264',
  primaryDeep: '#085A50',
  primaryLight: '#1A9D8A',
  primaryTint: '#DCEDE9',
  primarySoft: 'rgba(12,114,100,0.10)',

  coral: '#E0594E',
  coralDeep: '#BA3F35',
  coralTint: '#FBE5E2',

  amber: '#D89220',
  amberDeep: '#A87010',
  amberTint: '#FCEED0',

  lavender: '#8266B5',
  lavenderTint: '#ECE3F6',

  sky: '#2C6FB5',
  skyTint: '#DCE9F6',

  white: '#FFFFFF',
  black: '#0E1014',
};

const G = {
  hero: ['#FCF7E9', '#F2EBDC'],
  splash: ['#0C7264', '#0A6457', '#085A50'],
  primary: ['#1A9D8A', '#0C7264'],
  primaryDeep: ['#0C7264', '#085A50'],
  coral: ['#E0594E', '#BA3F35'],
  amber: ['#E5A537', '#C57F12'],
  lavender: ['#9D7DC8', '#7556A5'],
  sky: ['#4A8DCC', '#1F5A99'],
  cream: ['#FAF4E6', '#F2EBDC'],
};
const GS = { x: 0, y: 0 };
const GE = { x: 1, y: 1 };

const SHADOW = {
  card: Platform.select({
    web: { boxShadow: '0 2px 4px rgba(26,28,32,0.04), 0 12px 28px rgba(26,28,32,0.06)' },
    default: { shadowColor: '#1A1C20', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 3 },
  }),
  raised: Platform.select({
    web: { boxShadow: '0 12px 36px rgba(26,28,32,0.14)' },
    default: { shadowColor: '#1A1C20', shadowOpacity: 0.16, shadowOffset: { width: 0, height: 12 }, shadowRadius: 24, elevation: 10 },
  }),
  hero: Platform.select({
    web: { boxShadow: '0 24px 50px rgba(8,90,80,0.18)' },
    default: { shadowColor: '#085A50', shadowOpacity: 0.20, shadowOffset: { width: 0, height: 18 }, shadowRadius: 32, elevation: 14 },
  }),
  glowPrimary: Platform.select({
    web: { boxShadow: '0 12px 26px rgba(12,114,100,0.40)' },
    default: { shadowColor: '#0C7264', shadowOpacity: 0.40, shadowOffset: { width: 0, height: 12 }, shadowRadius: 20, elevation: 8 },
  }),
};

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
const HAS_CLOUD_API = Boolean(API_BASE_URL);
const COST_STATUS = publicCostStatus({
  COST_MODE: process.env.COST_MODE,
  EXPO_PUBLIC_COST_MODE: process.env.EXPO_PUBLIC_COST_MODE,
});
const AUTH_TOKEN_KEY = 'jkshz_auth_token';
const WORKSPACE_TOKEN = 'workspace_session_token';
const WORKSPACE_USER_KEY = 'jkshz_workspace_user';
const WORKSPACE_DATA_KEY = 'jkshz_workspace_app_data';
const DEFAULT_WORKSPACE_USER = {
  id: 'primary_workspace', email: 'user@jiankang.local', name: '张医生', role: '康复师',
};

async function apiRequest(path, { method = 'GET', body, token } = {}) {
  if (!HAS_CLOUD_API) throw new Error('账号服务暂时不可用，请稍后重试。');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.message || '服务器请求失败');
  return data;
}

/* ============================================================
 * AI 康复助手 —— BYOK（用户自带 Key）OpenAI 兼容客户端
 * 设计原则：API Key 只保存在当前运行内存，绝不写入本地持久存储或我们的服务器；
 * 安卓原生直连国内厂商（无 CORS 限制），可选填代理地址供 Web 端绕过 CORS。
 * ============================================================ */
const AI_CONFIG_KEY = 'jkshz_ai_config';
const AI_CHAT_KEY = 'jkshz_ai_chat';
const AI_PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', hint: '深度求索 · 国内直连 · 性价比高', keyUrl: 'platform.deepseek.com' },
  { id: 'zhipu', name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash', hint: 'GLM-4-Flash 提供免费额度', keyUrl: 'bigmodel.cn' },
  { id: 'qwen', name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', hint: '阿里云百炼 · OpenAI 兼容模式', keyUrl: 'bailian.console.aliyun.com' },
  { id: 'moonshot', name: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', hint: '月之暗面 Moonshot', keyUrl: 'platform.moonshot.cn' },
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', hint: '需自行解决网络访问', keyUrl: 'platform.openai.com' },
  { id: 'custom', name: '自定义', baseUrl: '', model: '', hint: '任意 OpenAI 兼容接口', keyUrl: '' },
];
const DEFAULT_AI_CONFIG = { provider: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', apiKey: '', proxyUrl: '', temperature: 0.6 };
const AI_SYSTEM_PROMPT = '你是“健康守护者”个人作品演示中的 AI 康复助手。你的任务是复述和整理用户提供的记录，输出：① 记录摘要 ② 需要医生或康复师复核的训练建议草案 ③ 就医与安全提醒。不要诊断，不要声称处方或治疗效果，不要编造未提供的数值。每次结尾必须说明：内容仅供记录整理，不提供诊断，不能替代医生或康复师，也不用于急救；若出现紧急情况，应立即联系当地急救服务。';

async function loadAiConfig() {
  try { const raw = await Storage.getItem(AI_CONFIG_KEY); if (raw) return { ...DEFAULT_AI_CONFIG, ...JSON.parse(raw) }; } catch (e) {}
  return { ...DEFAULT_AI_CONFIG };
}
async function persistAiConfig(cfg) {
  try { await Storage.setItem(AI_CONFIG_KEY, JSON.stringify({ ...cfg, apiKey: '' })); } catch (e) {}
}
function aiConfigured(cfg) { return Boolean(cfg && cfg.apiKey && cfg.baseUrl && cfg.model); }

async function aiChat(cfg, messages, { signal } = {}) {
  if (!aiConfigured(cfg)) throw new Error('尚未连接模型，请先在右上角配置你的 AI 服务。');
  const base = String(cfg.baseUrl || '').replace(/\/$/, '');
  let url; let headers; let payload;
  if (cfg.proxyUrl && cfg.proxyUrl.trim()) {
    url = cfg.proxyUrl.trim().replace(/\/$/, '') + '/api/ai/chat';
    headers = { 'Content-Type': 'application/json' };
    payload = { baseUrl: base, apiKey: cfg.apiKey, model: cfg.model, messages, temperature: cfg.temperature };
  } else {
    url = base + '/chat/completions';
    headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` };
    payload = { model: cfg.model, messages, temperature: typeof cfg.temperature === 'number' ? cfg.temperature : 0.6, stream: false };
  }
  let res;
  try { res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal }); }
  catch (e) { throw new Error('网络请求失败，请检查接口地址与网络（Web 端部分厂商需配置代理）。'); }
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch (e) { throw new Error('返回内容无法解析：' + text.slice(0, 120)); }
  if (!res.ok) {
    const raw = (data.error && (data.error.message || data.error)) || data.message || `请求失败（${res.status}）`;
    throw new Error(typeof raw === 'string' ? raw : JSON.stringify(raw));
  }
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) throw new Error('模型未返回内容，请检查模型名称或账户额度。');
  return String(content).trim();
}

function patientStats(name, assessments, records, prescriptions) {
  const a = (assessments || []).filter((x) => x.patient === name);
  const r = (records || []).filter((x) => x.patient === name);
  const rx = (prescriptions || []).filter((x) => x.patient === name);
  const latest = a[0] || null;
  const avgScore = r.length ? Math.round(r.reduce((s, x) => s + (x.score || 0), 0) / r.length) : (latest ? latest.score : 0);
  const avgCompletion = r.length ? Math.round(r.reduce((s, x) => s + (x.completion || 0), 0) / r.length) : 0;
  const totalMin = r.reduce((s, x) => s + (x.duration || 0), 0);
  return { a, r, rx, latest, avgScore, avgCompletion, totalMin };
}

function buildPatientContext(patient, assessments, records, prescriptions) {
  const s = patientStats(patient.name, assessments, records, prescriptions);
  const lines = [];
  lines.push(`患者：${patient.name}，${patient.age}岁，诊断「${patient.diagnosis}」，患侧${patient.side}，当前${patient.stage}，风险等级${patient.risk}。`);
  if (s.latest) lines.push(`最新评估（${s.latest.date}）：握力${s.latest.grip}kg，关节活动度${s.latest.rom}%，疼痛${s.latest.pain}/10，日常生活能力${s.latest.adl}%，综合评分${s.latest.score}。`);
  else lines.push('暂无评估记录。');
  if (s.r.length) {
    lines.push(`训练记录共${s.r.length}条，平均完成率${s.avgCompletion}%，平均得分${s.avgScore}，累计训练${s.totalMin}分钟。`);
    lines.push('近期训练：' + s.r.slice(0, 5).map((x) => `${x.date} ${x.type} 完成${x.completion}% 得分${x.score}`).join('；') + '。');
  } else { lines.push('暂无训练记录。'); }
  if (s.rx.length) lines.push('现有训练建议草案：' + s.rx.map((x) => `${x.title}（强度${x.intensity}/${x.frequency}/${x.duration}/${x.status}）`).join('；') + '。');
  return lines.join('\n');
}

// 离线兜底：按确定性规则整理虚构演示记录，不冒充模型或医疗结论。
function localRecordSummary(patient, assessments, records, prescriptions) {
  const s = patientStats(patient.name, assessments, records, prescriptions);
  const score = s.latest ? s.latest.score : s.avgScore || 60;
  const level = score >= 75 ? '良好' : score >= 60 ? '中等' : '偏弱';
  const pain = s.latest ? s.latest.pain : 3;
  const rom = s.latest ? s.latest.rom : 55;
  const grip = s.latest ? s.latest.grip : 18;
  const out = [];
  out.push(`## ${patient.name} · 记录解读`);
  out.push(`记录中的综合评分为 **${score}** 分（演示分档：**${level}**）。档案字段记录为「${patient.diagnosis}」，患侧${patient.side}，当前${patient.stage}。这些字段仅复述录入内容。`);
  out.push(`- 握力记录：**${grip}kg**`);
  out.push(`- 关节活动度记录：**${rom}%**`);
  out.push(`- 疼痛记录：**${pain}/10**`);
  out.push('## 训练建议草案（待专业人员复核）');
  out.push('1. 核对上述记录是否完整，并由医生或康复师判断训练是否适合继续。');
  out.push(`2. 可供复核的关注项：${rom < 70 ? '活动度记录、' : ''}${grip < 22 ? '握力记录、' : ''}精细动作完成情况。`);
  out.push('3. 具体强度、频次、时长和负荷调整由医生或康复师结合面诊决定。');
  out.push('## 安全提醒');
  out.push(`- ${pain >= 5 ? '记录中的疼痛数值较高；请停止自行调整，并联系专业人员。' : '继续记录训练后是否出现肿胀、疼痛加重或其他异常。'}`);
  out.push('- 如出现紧急或快速恶化的症状，请立即联系当地急救服务。');
  out.push('> 本内容由本地演示规则生成，仅供记录整理，不提供诊断，不能替代医生或康复师，也不用于急救。');
  return out.join('\n');
}

const initialPatients = [
  { id: 'p1', name: '李明', age: '62', diagnosis: '脑卒中恢复期', side: '右手', stage: '第4周', risk: '低风险', next: '今天 15:00', phone: '13800000001' },
  { id: 'p2', name: '王阿姨', age: '68', diagnosis: '腕关节术后', side: '左手', stage: '第2周', risk: '中风险', next: '明天 10:30', phone: '13800000002' },
];
const initialDevices = [
  { id: 'd1', name: '智能握力手套 A01', type: '康复手套', status: 'online', battery: 82, signal: 94, patient: '李明', lastSync: '3分钟前' },
  { id: 'd2', name: '腕部活动度传感器 B12', type: '角度传感器', status: 'online', battery: 57, signal: 76, patient: '王阿姨', lastSync: '18分钟前' },
  { id: 'd3', name: '肌张力采集器 C07', type: '肌电设备', status: 'standby', battery: 21, signal: 18, patient: '未绑定', lastSync: '昨天 19:20' },
];
const initialAssessments = [
  { id: 'a1', patient: '李明', date: '2026-04-26', grip: 22, rom: 66, pain: 2, adl: 72, score: 78, note: '虚构演示记录：握力数值较前次记录增加，训练安排待专业人员复核。' },
  { id: 'a2', patient: '王阿姨', date: '2026-04-25', grip: 15, rom: 48, pain: 4, adl: 58, score: 64, note: '虚构演示记录：已记录活动度与疼痛数值，未形成医疗判断。' },
];
const initialPrescriptions = [
  { id: 'rx1', patient: '李明', title: '手指分离记录草案', intensity: '中等', frequency: '每日 2 次', duration: '15 分钟', status: '待专业人员确认', focus: '精细动作、抓握稳定性' },
  { id: 'rx2', patient: '王阿姨', title: '腕关节活动记录草案', intensity: '轻柔', frequency: '每日 3 次', duration: '10 分钟', status: '待专业人员确认', focus: '屈伸活动度、疼痛记录' },
];
const initialRecords = [
  { id: 'r1', patient: '李明', type: '抓握训练', date: '2026-04-26', duration: 18, completion: 92, score: 86 },
  { id: 'r2', patient: '王阿姨', type: '腕部活动', date: '2026-04-25', duration: 12, completion: 78, score: 73 },
  { id: 'r3', patient: '李明', type: '精细动作', date: '2026-04-24', duration: 15, completion: 88, score: 81 },
];
const initialReports = [
  { id: 'rp1', patient: '李明', title: '第4周训练记录摘要', date: '2026-04-26', status: '演示草案', summary: '虚构记录显示本周握力数值与完成率高于前次；不据此形成训练调整或医疗结论。' },
  { id: 'rp2', patient: '王阿姨', title: '活动度记录摘要', date: '2026-04-25', status: '待专业人员复核', summary: '虚构记录包含疼痛与腕部活动度数值；下一步安排由医生或康复师判断。' },
];
const initialStorage = [
  { id: 's1', title: '评估量表模板', type: '模板', owner: '系统', updated: '2026-04-21', size: '124 KB' },
  { id: 's2', title: '李明-训练曲线原始数据', type: '数据', owner: '张医生', updated: '2026-04-26', size: '2.1 MB' },
  { id: 's3', title: '患者知情同意书', type: '文档', owner: '管理员', updated: '2026-04-18', size: '430 KB' },
];
const initialTasks = [
  { id: 't1', title: '李明 15:00 复评', meta: '握力 + ROM', priority: '高', done: false },
  { id: 't2', title: '王阿姨建议草案复核', meta: '术后第2周', priority: '中', done: false },
  { id: 't3', title: '同步手套 A01 数据', meta: '设备中心', priority: '低', done: true },
];
const yesterday = formatLocalDate(new Date(now.getTime() - 86400000));
const initialEngagement = { streak: 6, lastCheckIn: yesterday, totalCheckIns: 23, planDate: today, planDone: [] };
// 今日康复计划模板（每日重置完成状态）
const DAILY_PLAN = [
  { id: 'pl_warm', title: '热身与关节活动', meta: '5 分钟 · 被动牵伸', icon: 'leaf-outline', grad: G.primary },
  { id: 'pl_grip', title: '抓握力量训练', meta: '3 组 · 互动训练', icon: 'hand-left-outline', grad: G.sky },
  { id: 'pl_fine', title: '手指精细动作', meta: '捏取 / 分离控制', icon: 'finger-print-outline', grad: G.lavender },
  { id: 'pl_log', title: '记录今日状态', meta: '疼痛 / 完成度', icon: 'create-outline', grad: G.amber },
];
// 康复小知识卡片（纯本地内容，零成本）
const KNOWLEDGE_CARDS = [
  { id: 'k1', tag: '科普', title: '为什么手部康复要趁早？', body: '神经可塑性在损伤后早期最活跃，尽早开始规范训练有助于重建运动通路。', icon: 'bulb-outline', grad: G.amber },
  { id: 'k2', tag: '技巧', title: '镜像疗法小知识', body: '用健侧手在镜中“替代”患侧，可激活大脑运动区，辅助偏瘫手功能恢复。', icon: 'sparkles-outline', grad: G.lavender },
  { id: 'k3', tag: '提醒', title: '训练后手肿怎么办？', body: '适度抬高患肢、轻柔向心按摩，若持续肿胀或疼痛加重应及时复诊。', icon: 'medkit-outline', grad: G.coral },
];
const tabs = [
  { key: 'workbench', label: '工作台', icon: 'grid-outline', activeIcon: 'grid' },
  { key: 'training', label: '训练', icon: 'pulse-outline', activeIcon: 'pulse' },
  { key: 'ai', label: 'AI博士', icon: 'sparkles-outline', activeIcon: 'sparkles', center: true },
  { key: 'data', label: '数据', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  { key: 'profile', label: '我的', icon: 'person-outline', activeIcon: 'person' },
];
const AVATAR_PALETTE = [
  { grad: ['#1A9D8A', '#0C7264'], fg: '#085A50' },
  { grad: ['#E0594E', '#BA3F35'], fg: '#9C2F26' },
  { grad: ['#E5A537', '#C57F12'], fg: '#9C620A' },
  { grad: ['#9D7DC8', '#7556A5'], fg: '#5E418A' },
  { grad: ['#4A8DCC', '#1F5A99'], fg: '#194E85' },
];
function avatarOf(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}
function uid(prefix) { return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function scoreAssessment(grip, rom, pain, adl) {
  return clamp(Math.round(Number(grip) * 1.2 + Number(rom) * 0.35 + Number(adl) * 0.35 - Number(pain) * 4), 0, 100);
}
function scoreTone(score) {
  if (score >= 75) return { bg: C.primaryTint, fg: C.primaryDeep, grad: G.primary };
  if (score >= 60) return { bg: C.amberTint, fg: C.amberDeep, grad: G.amber };
  return { bg: C.coralTint, fg: C.coralDeep, grad: G.coral };
}
function defaultAppData() {
  return {
    patients: initialPatients, devices: initialDevices, assessments: initialAssessments,
    prescriptions: initialPrescriptions, records: initialRecords, reports: initialReports,
    storage: initialStorage, tasks: initialTasks, engagement: { ...initialEngagement },
  };
}

/* ============================ SVG 图形组件 ============================ */
// 工作台 hero 的徽章式插画：柔和光晕 + 弧形进度环 + 心电波形
function HeroMedallion({ size = 160, pct = 0.86 }) {
  const cx = size / 2, cy = size / 2;
  const rOuter = size / 2 - 12;
  const circ = 2 * Math.PI * rOuter;
  const fill = circ * clamp(pct, 0, 1);
  const id = 'hm-' + Math.floor(Math.random() * 1e9);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <SvgLG id={id + 'g1'} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#1A9D8A" />
          <Stop offset="1" stopColor="#085A50" />
        </SvgLG>
        <SvgRG id={id + 'rg'} cx="0.5" cy="0.5" r="0.7">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#F4F7FB" />
        </SvgRG>
        <SvgRG id={id + 'halo'} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0.55" stopColor="#0C7264" stopOpacity="0.12" />
          <Stop offset="0.85" stopColor="#0C7264" stopOpacity="0.04" />
          <Stop offset="1" stopColor="#0C7264" stopOpacity="0" />
        </SvgRG>
      </Defs>
      {/* 柔和光晕（取代外围放射短线） */}
      <Circle cx={cx} cy={cy} r={size / 2} fill={`url(#${id}halo)`} />
      {/* 极淡外辅环（无刺，纯净环） */}
      <Circle cx={cx} cy={cy} r={rOuter + 6} stroke="#0C7264" strokeOpacity={0.06} strokeWidth={1} fill="none" />
      {/* 内底（冷白渐变） */}
      <Circle cx={cx} cy={cy} r={rOuter - 8} fill={`url(#${id}rg)`} />
      {/* 灰色环底 */}
      <Circle cx={cx} cy={cy} r={rOuter} stroke="#0C7264" strokeOpacity={0.12} strokeWidth={7} fill="none" />
      {/* 进度弧 */}
      <Circle cx={cx} cy={cy} r={rOuter} stroke={`url(#${id}g1)`} strokeWidth={7} fill="none" strokeLinecap="round" strokeDasharray={`${fill} ${circ - fill}`} transform={`rotate(-90 ${cx} ${cy})`} />
      {/* 心电波形 */}
      {(() => {
        const p1x = cx - rOuter * 0.55, py = cy;
        const points = [
          [p1x, py],
          [p1x + 14, py],
          [p1x + 22, py - 22],
          [p1x + 32, py + 30],
          [p1x + 44, py - 8],
          [p1x + 54, py],
          [cx + rOuter * 0.55, py],
        ];
        const d = points.map((p, i) => (i === 0 ? `M${p[0]} ${p[1]}` : `L${p[0]} ${p[1]}`)).join(' ');
        return (
          <>
            <Path d={d} stroke="#0C7264" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Circle cx={points[2][0]} cy={points[2][1]} r={5} fill="#E0594E" />
          </>
        );
      })()}
      {/* 进度终点光点（白心 + 翡翠核） */}
      {(() => {
        const a = -Math.PI / 2 + Math.PI * 2 * clamp(pct, 0, 1);
        const x = cx + Math.cos(a) * rOuter;
        const y = cy + Math.sin(a) * rOuter;
        return <>
          <Circle cx={x} cy={y} r={7.5} fill="#FFFFFF" />
          <Circle cx={x} cy={y} r={4} fill="#1A9D8A" />
        </>;
      })()}
    </Svg>
  );
}

// 小型弧形进度（指标卡用）
function ArcMini({ size = 50, pct = 0.7, color = C.primary, track = 'rgba(12,114,100,0.12)', strokeWidth = 5 }) {
  const cx = size / 2, cy = size / 2, r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ * clamp(pct, 0, 1);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx} cy={cy} r={r} stroke={track} strokeWidth={strokeWidth} fill="none" />
      <Circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeDasharray={`${fill} ${circ - fill}`} transform={`rotate(-90 ${cx} ${cy})`} />
    </Svg>
  );
}

// 波浪分隔条
function WaveDivider({ color = C.bg, height = 28 }) {
  return (
    <Svg width="100%" height={height} viewBox={`0 0 360 ${height}`} preserveAspectRatio="none">
      <Path d={`M0,${height * 0.55} Q60,${height * 0.05} 120,${height * 0.55} T240,${height * 0.55} T360,${height * 0.55} L360,${height} L0,${height} Z`} fill={color} />
    </Svg>
  );
}

// SVG 折线 sparkline
function SparkLine({ values, color = C.primary, width: w = 90, height: h = 28 }) {
  if (!values || values.length < 2) values = [40, 60, 50, 70, 65, 80, 78];
  const max = Math.max(...values), min = Math.min(...values);
  const range = Math.max(1, max - min);
  const stepX = w / (values.length - 1);
  const path = values.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
  }).join(' ');
  const area = path + ` L${w} ${h} L0 ${h} Z`;
  const id = 'sl-' + Math.floor(Math.random() * 1e9);
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Defs>
        <SvgLG id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.30} />
          <Stop offset="1" stopColor={color} stopOpacity={0.02} />
        </SvgLG>
      </Defs>
      <Path d={area} fill={`url(#${id})`} />
      <Path d={path} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

// SVG 渐变柱
function GradientBar({ height: h, width: w = 30, colors = G.primary }) {
  const id = 'gb-' + Math.floor(Math.random() * 1e9);
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Defs>
        <SvgLG id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors[0]} />
          <Stop offset="1" stopColor={colors[1]} />
        </SvgLG>
      </Defs>
      <Rect x="0" y="0" width={w} height={h} rx={w / 3} fill={`url(#${id})`} />
    </Svg>
  );
}

/* ============================ 动效与富文本 ============================ */
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

// 入场淡入 + 轻微上滑（按顺序错峰，营造现代感）
function Appear({ children, delay = 0, offset = 14, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(v, { toValue: 1, duration: 460, delay, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER });
    anim.start();
    return () => anim.stop();
  }, [v, delay]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// 数字滚动（count-up）—— 用 rAF 自驱动 + 定时兜底，保证任何环境下最终都落在正确数值
function AnimatedNumber({ value, style, duration = 1100, format }) {
  const target = Number(value) || 0;
  const [shown, setShown] = useState(target);
  const rafRef = useRef(null);
  useEffect(() => {
    let start = null;
    setShown(0);
    const tick = (ts) => {
      if (start == null) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(target * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    const safety = setTimeout(() => setShown(target), duration + 150);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); clearTimeout(safety); };
  }, [target, duration]);
  const n = Math.round(shown);
  return <Text style={style}>{format ? format(n) : n}</Text>;
}

// 按压缩放（让卡片/按钮“可点感”更强）
function Pressable({ children, onPress, style, scaleTo = 0.97, activeOpacity = 0.92 }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (val) => Animated.spring(s, { toValue: val, useNativeDriver: USE_NATIVE_DRIVER, speed: 40, bounciness: 6 }).start();
  return (
    <TouchableOpacity activeOpacity={activeOpacity} onPress={onPress} onPressIn={() => to(scaleTo)} onPressOut={() => to(1)}>
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

// 打字机式逐字显示（模拟流式输出）
function useTypewriter(fullText, active, speed = 14) {
  const [shown, setShown] = useState(active ? '' : fullText);
  useEffect(() => {
    if (!active) { setShown(fullText); return undefined; }
    setShown('');
    let i = 0;
    const step = Math.max(1, Math.round(fullText.length / 220)); // 长文本加速
    const timer = setInterval(() => {
      i += step;
      if (i >= fullText.length) { setShown(fullText); clearInterval(timer); }
      else setShown(fullText.slice(0, i));
    }, speed);
    // 兜底：无论计时器是否被节流/页面切后台，到时强制显示全文
    const safety = setTimeout(() => { setShown(fullText); clearInterval(timer); }, Math.max(1800, (fullText.length / step) * speed + 800));
    return () => { clearInterval(timer); clearTimeout(safety); };
  }, [fullText, active, speed]);
  return shown;
}

// 三点“思考中”动画
function TypingDots({ color = C.primary }) {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => {
    const loops = dots.map((d, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 160),
      Animated.timing(d, { toValue: 1, duration: 320, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(d, { toValue: 0.3, duration: 320, useNativeDriver: USE_NATIVE_DRIVER }),
    ])));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {dots.map((d, i) => <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 4, marginRight: 5, backgroundColor: color, opacity: d }} />)}
    </View>
  );
}

// 行内 **加粗** 解析
function renderInline(text, baseStyle, keyPrefix) {
  const parts = String(text).split('**');
  return parts.map((p, i) => (i % 2 === 1
    ? <Text key={`${keyPrefix}-b${i}`} style={[baseStyle, styles.mdBold]}>{p}</Text>
    : <Text key={`${keyPrefix}-n${i}`} style={baseStyle}>{p}</Text>));
}

// 轻量 Markdown 渲染（标题/要点/有序/引用/段落 + 行内加粗）
function MarkdownLite({ text }) {
  const lines = String(text || '').split('\n');
  return (
    <View>
      {lines.map((raw, i) => {
        const line = raw.replace(/\s+$/, '');
        if (!line.trim()) return <View key={i} style={{ height: 8 }} />;
        if (/^#{1,3}\s+/.test(line)) {
          const t = line.replace(/^#{1,3}\s+/, '');
          return <Text key={i} style={styles.mdH}>{renderInline(t, styles.mdH, `h${i}`)}</Text>;
        }
        if (/^>\s?/.test(line)) {
          return (
            <View key={i} style={styles.mdQuote}>
              <Text style={styles.mdQuoteText}>{renderInline(line.replace(/^>\s?/, ''), styles.mdQuoteText, `q${i}`)}</Text>
            </View>
          );
        }
        const ordered = line.match(/^(\d+)\.\s+(.*)$/);
        if (ordered) {
          return (
            <View key={i} style={styles.mdRow}>
              <Text style={styles.mdNum}>{ordered[1]}</Text>
              <Text style={styles.mdP}>{renderInline(ordered[2], styles.mdP, `o${i}`)}</Text>
            </View>
          );
        }
        if (/^[-*•]\s+/.test(line)) {
          return (
            <View key={i} style={styles.mdRow}>
              <View style={styles.mdDot} />
              <Text style={styles.mdP}>{renderInline(line.replace(/^[-*•]\s+/, ''), styles.mdP, `l${i}`)}</Text>
            </View>
          );
        }
        return <Text key={i} style={styles.mdP}>{renderInline(line, styles.mdP, `p${i}`)}</Text>;
      })}
    </View>
  );
}

// 成就徽章（解锁/未解锁两态）
function AchievementBadge({ icon, label, unlocked, grad }) {
  return (
    <View style={styles.achItem}>
      {unlocked ? (
        <LinearGradient colors={grad || G.amber} start={GS} end={GE} style={styles.achMedal}>
          <Ionicons name={icon} size={22} color={C.white} />
        </LinearGradient>
      ) : (
        <View style={[styles.achMedal, styles.achMedalLock]}>
          <Ionicons name="lock-closed" size={16} color={C.faint} />
        </View>
      )}
      <Text style={[styles.achLabel, !unlocked && { color: C.faint }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/* ============================ 基础组件 ============================ */
function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function IconTile({ icon, size, dim, tone, gradient }) {
  const box = dim || 44;
  if (gradient) {
    return (
      <LinearGradient colors={gradient} start={GS} end={GE} style={[styles.iconTile, { width: box, height: box, borderRadius: Math.round(box * 0.32) }]}>
        <Ionicons name={icon} size={size || Math.round(box * 0.48)} color={C.white} />
      </LinearGradient>
    );
  }
  let bg = C.surfaceMuted; let fg = C.inkSoft;
  if (tone === 'primary') { bg = C.primaryTint; fg = C.primaryDeep; }
  else if (tone === 'coral') { bg = C.coralTint; fg = C.coralDeep; }
  else if (tone === 'amber') { bg = C.amberTint; fg = C.amberDeep; }
  else if (tone === 'lavender') { bg = C.lavenderTint; fg = '#5E418A'; }
  else if (tone === 'sky') { bg = C.skyTint; fg = '#194E85'; }
  else if (tone === 'ink') { bg = C.ink; fg = C.white; }
  return (
    <View style={[styles.iconTile, { width: box, height: box, borderRadius: Math.round(box * 0.32), backgroundColor: bg }]}>
      <Ionicons name={icon} size={size || Math.round(box * 0.48)} color={fg} />
    </View>
  );
}

function GradientAvatar({ name, dim, textSize }) {
  const box = dim || 48;
  const av = avatarOf(name || '康');
  return (
    <LinearGradient colors={av.grad} start={GS} end={GE} style={[styles.avatar, { width: box, height: box, borderRadius: box * 0.34 }]}>
      <Text style={[styles.avatarText, { fontSize: textSize || Math.round(box * 0.42) }]}>{(name || '康').slice(0, 1)}</Text>
    </LinearGradient>
  );
}

// 编号小标贴 "01 — TODAY"
function NumberedEyebrow({ num, label, color }) {
  const c = color || C.primaryDeep;
  return (
    <View style={styles.numEyeWrap}>
      <Text style={[styles.numEyeNum, { color: c }]}>{num}</Text>
      <View style={[styles.numEyeLine, { backgroundColor: c }]} />
      <Text style={[styles.numEyeLabel, { color: c }]}>{label}</Text>
    </View>
  );
}

function SectionHeader({ num, eyebrow, eyebrowColor, title, subtitle, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.flex}>
        {!!eyebrow && (num ? <NumberedEyebrow num={num} label={eyebrow} color={eyebrowColor} /> : null)}
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {!!action && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7} style={styles.textAction} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.textActionLabel}>{action}</Text>
          <Ionicons name="arrow-forward" size={14} color={C.primaryDeep} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function PrimaryButton({ label, icon, onPress, tone, style, disabled, gradient }) {
  const ghost = tone === 'ghost';
  if (ghost) {
    return (
      <TouchableOpacity activeOpacity={0.7} disabled={disabled} onPress={onPress} style={[styles.btnGhost, style]}>
        {!!icon && <Ionicons name={icon} size={17} color={C.inkSoft} style={styles.btnIcon} />}
        <Text style={styles.btnGhostText}>{label}</Text>
      </TouchableOpacity>
    );
  }
  const grad = disabled ? ['#C2C7D2', '#A8AEBC']
    : gradient || (tone === 'coral' ? G.coral : tone === 'amber' ? G.amber : tone === 'lavender' ? G.lavender : G.primaryDeep);
  return (
    <TouchableOpacity activeOpacity={0.88} disabled={disabled} onPress={onPress} style={[styles.btnWrap, !disabled && SHADOW.glowPrimary, style]}>
      <LinearGradient colors={grad} start={GS} end={GE} style={styles.btn}>
        {!!icon && <Ionicons name={icon} size={17} color={C.white} style={styles.btnIcon} />}
        <Text style={styles.btnText}>{label}</Text>
        <Ionicons name="arrow-forward" size={15} color={C.white} style={styles.btnTrail} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

function InputField({ label, icon, value, onChangeText, placeholder, keyboardType, secureTextEntry, right }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputBox}>
        {!!icon && <Ionicons name={icon} size={17} color={C.primaryDeep} style={styles.inputIcon} />}
        <TextInput
          value={value} onChangeText={onChangeText} placeholder={placeholder}
          placeholderTextColor={C.faint} keyboardType={keyboardType}
          secureTextEntry={secureTextEntry} style={styles.input} autoCapitalize="none"
        />
        {right}
      </View>
    </View>
  );
}

function Chip({ label, active, onPress, tone }) {
  const palette = tone === 'coral' ? { bg: C.coralDeep, fg: C.white }
    : tone === 'amber' ? { bg: C.amberDeep, fg: C.white }
    : tone === 'lavender' ? { bg: '#5E418A', fg: C.white }
    : { bg: C.primaryDeep, fg: C.white }; // 默认选中态用主色绿（替代墨黑，柔和很多）
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={[styles.chip, active && { backgroundColor: palette.bg, borderColor: palette.bg }]}>
      <Text style={[styles.chipText, active && { color: palette.fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ProgressBar({ value, color, height, gradient }) {
  const v = clamp(value, 0, 100);
  return (
    <View style={[styles.progressTrack, { height: height || 7 }]}>
      {gradient ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: v + '%' }]} />
      ) : (
        <View style={[styles.progressFill, { width: v + '%', backgroundColor: color || C.primary }]} />
      )}
    </View>
  );
}

function Badge({ label, tone }) {
  let bg = C.surfaceMuted; let fg = C.muted;
  if (tone === 'primary') { bg = C.primaryTint; fg = C.primaryDeep; }
  else if (tone === 'amber') { bg = C.amberTint; fg = C.amberDeep; }
  else if (tone === 'coral') { bg = C.coralTint; fg = C.coralDeep; }
  else if (tone === 'lavender') { bg = C.lavenderTint; fg = '#5E418A'; }
  else if (tone === 'sky') { bg = C.skyTint; fg = '#194E85'; }
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: fg }]} />
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

function EmptyState({ icon, title, caption, action, onAction, tone }) {
  return (
    <Card style={styles.emptyState}>
      <IconTile icon={icon || 'file-tray-outline'} dim={60} tone={tone || 'primary'} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!caption && <Text style={styles.emptyCaption}>{caption}</Text>}
      {!!action && <PrimaryButton label={action} icon="add" tone="ghost" onPress={onAction} style={styles.emptyAction} />}
    </Card>
  );
}

function ModalSheet({ visible, title, subtitle, children, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalShade}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={styles.flex}>
              <Text style={styles.modalTitle}>{title}</Text>
              {!!subtitle && <Text style={styles.modalSubtitle}>{subtitle}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={C.inkSoft} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalBody}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PageHeader({ num, eyebrow, title, subtitle, right }) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.flex}>
        {!!eyebrow && <NumberedEyebrow num={num || '·'} label={eyebrow} />}
        <Text style={styles.pageTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.pageSubtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

function SegmentedControl({ items, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentWrap}>
      {items.map((item) => {
        const active = value === item.key;
        return (
          <TouchableOpacity key={item.key} activeOpacity={0.8} onPress={() => onChange(item.key)} style={styles.segmentTouch}>
            {active ? (
              <LinearGradient colors={G.primaryDeep} start={GS} end={GE} style={styles.segmentActive}>
                <Ionicons name={item.icon} size={15} color={C.white} />
                <Text style={styles.segmentActiveText}>{item.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.segmentItem}>
                <Ionicons name={item.icon} size={15} color={C.muted} />
                <Text style={styles.segmentText}>{item.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/* ============================ 登录 ============================ */
function LoginScreen({ onLogin, onWorkspaceLogin }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [account, setAccount] = useState('demo@jiankang.local');
  const [password, setPassword] = useState('demo1234');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('康复师');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!account.trim()) { Alert.alert('提示', '请输入邮箱'); return; }
    if (!password.trim() || password.length < 8) { Alert.alert('提示', '请输入至少 8 位密码'); return; }
    if (mode === 'register' && !name.trim()) { Alert.alert('提示', '请输入姓名'); return; }
    if (!HAS_CLOUD_API) {
      const nowIso = new Date().toISOString();
      const normalizedEmail = account.trim().toLowerCase();
      try {
        setSubmitting(true);
        await onWorkspaceLogin({
          id: `user_${normalizedEmail.replace(/[^a-z0-9]/g, '_')}`,
          email: normalizedEmail,
          name: mode === 'register' ? name.trim() : (normalizedEmail.split('@')[0] || '康复师'),
          role, createdAt: nowIso, updatedAt: nowIso,
        });
      } catch (error) { Alert.alert('登录失败', error.message || '请稍后重试。'); }
      finally { setSubmitting(false); }
      return;
    }
    try {
      setSubmitting(true);
      const data = await apiRequest(mode === 'register' ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST', body: { email: account.trim(), password, name: name.trim() || '张医生', role },
      });
      await Storage.setItem(AUTH_TOKEN_KEY, data.token);
      onLogin(data);
    } catch (error) { Alert.alert('登录失败', error.message || '请检查账号、密码或网络连接后重试。'); }
    finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.loginPage}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.loginScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.loginBrandWrap}>
          <View style={styles.loginMedallion}>
            <HeroMedallion size={120} pct={0.78} />
          </View>
          <NumberedEyebrow num="01" label="健康守护者" />
          <Text style={styles.loginTitle}>欢迎回来</Text>
          <Text style={styles.loginSubtitle}>训练记录与趋势管理作品演示</Text>
          <View style={styles.loginDisclosure}>
            <Text style={styles.loginDisclosureTitle}>个人作品演示 · 非医疗服务</Text>
            <Text style={styles.loginDisclosureText}>以下患者、训练与设备数据均为虚构演示数据；不提供诊断，不能替代医生或康复师，也不用于急救。</Text>
          </View>
        </View>

        <Card style={styles.loginCard}>
          <View style={styles.loginToggle}>
            <TouchableOpacity style={[styles.loginToggleItem, mode === 'login' && styles.loginToggleActive]} onPress={() => setMode('login')} activeOpacity={0.8}>
              <Text style={[styles.loginToggleText, mode === 'login' && styles.loginToggleTextActive]}>登录</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.loginToggleItem, mode === 'register' && styles.loginToggleActive]} onPress={() => setMode('register')} activeOpacity={0.8}>
              <Text style={[styles.loginToggleText, mode === 'register' && styles.loginToggleTextActive]}>注册</Text>
            </TouchableOpacity>
          </View>

          {mode === 'register' && <InputField label="姓名" icon="person-outline" value={name} onChangeText={setName} placeholder="请输入姓名" />}
          <InputField label="邮箱" icon="mail-outline" value={account} onChangeText={setAccount} placeholder="请输入邮箱" />
          <InputField label="密码" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="至少 8 位" secureTextEntry={!showPassword}
            right={(
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={C.faint} />
              </TouchableOpacity>
            )}
          />
          <Text style={styles.inputLabel}>身份</Text>
          <View style={styles.chipRow}>
            {['康复师', '医生', '管理员'].map((item) => <Chip key={item} label={item} active={role === item} onPress={() => setRole(item)} />)}
          </View>
          <PrimaryButton disabled={submitting} label={submitting ? '正在登录…' : mode === 'login' ? '登录账号' : '创建账号'} icon="log-in-outline" onPress={submit} style={styles.loginSubmit} />
          <View style={styles.loginDemo}>
            <Ionicons name="sparkles" size={14} color={C.amberDeep} />
            <Text style={styles.loginDemoText}>已预填演示账号，直接登录即可</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ============================ 工作台 ============================ */
function WorkbenchScreen({ user, patients, devices, assessments, records, reports, tasks, setTasks, engagement, setEngagement, aiConfig, openFlow, goTab }) {
  const onlineDevices = devices.filter((d) => d.status === 'online').length;
  const avgCompletion = records.length ? Math.round(records.reduce((sum, item) => sum + item.completion, 0) / records.length) : 0;
  const latestScore = assessments[0] ? assessments[0].score : 0;
  const highTasks = tasks.filter((t) => t.priority === '高' && !t.done).length;
  const doneCount = tasks.filter((t) => t.done).length;
  const recentScores = records.slice(0, 7).map((r) => r.score).reverse();
  const quickActions = [
    { title: '新建评估', caption: '握力 · ROM · 疼痛', icon: 'clipboard-outline', gradient: G.primary, action: () => openFlow('assessment') },
    { title: '建议草案', caption: '待专业人员复核', icon: 'medkit-outline', gradient: G.coral, action: () => openFlow('prescription') },
    { title: '开始训练', caption: '互动抓握模拟', icon: 'play-outline', gradient: G.amber, action: () => goTab('training') },
    { title: '数据报告', caption: '趋势与归档', icon: 'document-text-outline', gradient: G.lavender, action: () => goTab('data') },
    { title: '设备中心', caption: '手套 · 传感器', icon: 'hardware-chip-outline', gradient: G.sky, action: () => goTab('device') },
    { title: 'AI 助手', caption: '记录解读演示', icon: 'sparkles-outline', gradient: G.primaryDeep, action: () => goTab('ai') },
  ];
  const toggleTask = (id) => setTasks((prev) => prev.map((item) => item.id === id ? { ...item, done: !item.done } : item));

  // 康复打卡
  const eng = engagement || initialEngagement;
  const checkedToday = eng.lastCheckIn === today;
  const checkIn = () => {
    if (checkedToday) { Alert.alert('今日已打卡', `已连续坚持 ${eng.streak} 天，继续保持！`); return; }
    setEngagement((p) => {
      const base = p || initialEngagement;
      const cont = base.lastCheckIn === yesterday;
      return { ...base, streak: cont ? (base.streak || 0) + 1 : 1, lastCheckIn: today, totalCheckIns: (base.totalCheckIns || 0) + 1 };
    });
  };
  // 今日康复计划
  const planDone = eng.planDate === today ? (eng.planDone || []) : [];
  const togglePlan = (id) => setEngagement((p) => {
    const base = p || initialEngagement;
    const done = base.planDate === today ? (base.planDone || []) : [];
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
    return { ...base, planDate: today, planDone: next };
  });
  const planPct = Math.round(planDone.length / DAILY_PLAN.length * 100);
  // 成就徽章
  const achievements = [
    { id: 'streak', icon: 'flame', label: '坚持打卡', unlocked: (eng.streak || 0) >= 3, grad: G.coral },
    { id: 'train', icon: 'barbell', label: '训练达人', unlocked: records.length >= 5, grad: G.amber },
    { id: 'score', icon: 'ribbon', label: '高分选手', unlocked: records.some((r) => r.score >= 90), grad: G.primary },
    { id: 'assess', icon: 'clipboard', label: '评估先锋', unlocked: assessments.length >= 2, grad: G.sky },
    { id: 'ai', icon: 'sparkles', label: 'AI 体验', unlocked: aiConfigured(aiConfig), grad: G.lavender },
  ];
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.wbTopRow}>
        <View style={styles.flex}>
          <Text style={styles.wbGreetSmall}>{greeting} · {dateLabel} {todayWeekday}</Text>
          <Text style={styles.wbGreetBig}>你好，{user.name}</Text>
        </View>
        <TouchableOpacity style={styles.wbBell} activeOpacity={0.8} onPress={() => Alert.alert('通知', '你有 2 条待处理提醒。')}>
          <Ionicons name="notifications-outline" size={20} color={C.inkSoft} />
          <View style={styles.wbBellDot} />
        </TouchableOpacity>
      </View>

      {/* HERO */}
      <View style={[styles.wbHero, SHADOW.hero]}>
        <View style={styles.wbHeroInner}>
          <View style={styles.wbHeroTopRow}>
            <NumberedEyebrow num="01" label="今日守护" />
            <Text style={styles.wbHeroDate}>{dateLabel} · {todayWeekday}</Text>
          </View>

          <View style={styles.wbHeroMain}>
            <View style={styles.wbMedallion}>
              <HeroMedallion size={150} pct={avgCompletion / 100} />
            </View>
            <View style={styles.wbHeroRight}>
              <View style={styles.wbBigNumWrap}>
                <AnimatedNumber value={avgCompletion} style={styles.wbBigNum} />
                <Text style={styles.wbBigNumUnit}>%</Text>
              </View>
              <Text style={styles.wbBigNumLabel}>今日完成率</Text>
              <View style={styles.wbTrendChip}>
                <Ionicons name="trending-up" size={12} color={C.primaryDeep} />
                <Text style={styles.wbTrendText}>+12 vs 上周</Text>
              </View>
            </View>
          </View>

          <View style={styles.wbHeroSparkRow}>
            <SparkLine values={recentScores.length ? recentScores : [60, 70, 65, 78, 82, 80, 86]} color={C.primaryDeep} width={Math.max(160, APP_WIDTH - 220)} height={32} />
            <View style={styles.wbHeroSparkInfo}>
              <Text style={styles.wbHeroSparkBig}>{latestScore}</Text>
              <Text style={styles.wbHeroSparkSm}>最新评分</Text>
            </View>
          </View>

          <View style={styles.wbHeroStats}>
            <View style={styles.wbHeroStat}>
              <Text style={styles.wbHeroStatNum}>{patients.length}</Text>
              <Text style={styles.wbHeroStatLbl}>在管</Text>
            </View>
            <View style={styles.wbHeroStatDiv} />
            <View style={styles.wbHeroStat}>
              <Text style={styles.wbHeroStatNum}>{onlineDevices}</Text>
              <Text style={styles.wbHeroStatLbl}>设备在线</Text>
            </View>
            <View style={styles.wbHeroStatDiv} />
            <View style={styles.wbHeroStat}>
              <Text style={styles.wbHeroStatNum}>{highTasks}</Text>
              <Text style={[styles.wbHeroStatLbl, { color: C.coralDeep }]}>待处理</Text>
            </View>
          </View>
        </View>
        <WaveDivider color={C.bg} height={30} />
      </View>

      {/* AI 康复助手入口 */}
      <Appear delay={60}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => goTab('ai')} style={[styles.aiBanner, SHADOW.hero]}>
          <LinearGradient colors={G.primaryDeep} start={GS} end={GE} style={StyleSheet.absoluteFill} />
          <Svg width="100%" height="100%" viewBox="0 0 360 110" style={StyleSheet.absoluteFill} preserveAspectRatio="xMidYMid slice">
            <Defs>
              <SvgRG id="aiBannerBlob" cx="0.85" cy="0.2" r="0.6">
                <Stop offset="0" stopColor="#1FD09B" stopOpacity="0.45" />
                <Stop offset="1" stopColor="#1FD09B" stopOpacity="0" />
              </SvgRG>
            </Defs>
            <Rect width="360" height="110" fill="url(#aiBannerBlob)" />
            <Circle cx="320" cy="22" r="48" stroke="#FFFFFF" strokeOpacity="0.12" strokeWidth="1" fill="none" />
          </Svg>
          <View style={styles.aiBannerIcon}><Ionicons name="sparkles" size={24} color={C.white} /></View>
          <View style={styles.flex}>
            <View style={styles.aiBannerTagRow}>
              <Text style={styles.aiBannerTag}>NEW</Text>
              <Text style={styles.aiBannerEyebrow}>AI 康复助手</Text>
            </View>
            <Text style={styles.aiBannerTitle}>整理记录，形成待复核建议草案</Text>
            <Text style={styles.aiBannerSub}>{aiConfigured(aiConfig) ? '已连接你的模型 · 不提供诊断' : '本地规则演示 · 不提供诊断'}</Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={26} color="rgba(255,255,255,0.92)" />
        </TouchableOpacity>
      </Appear>

      {/* 康复打卡 streak */}
      <Appear delay={110}>
        <Card style={styles.streakCard}>
          <LinearGradient colors={checkedToday ? G.coral : ['#F0F4F1', '#F0F4F1']} start={GS} end={GE} style={styles.streakFlame}>
            <Ionicons name="flame" size={24} color={checkedToday ? C.white : C.faint} />
          </LinearGradient>
          <View style={[styles.flex, { marginLeft: 14 }]}>
            <View style={styles.streakNumRow}>
              <Text style={styles.streakNum}>{eng.streak || 0}</Text>
              <Text style={styles.streakUnit}>天</Text>
            </View>
            <Text style={styles.streakLabel}>连续康复打卡 · 累计 {eng.totalCheckIns || 0} 次</Text>
          </View>
          <TouchableOpacity activeOpacity={0.85} onPress={checkIn} disabled={checkedToday} style={styles.streakBtnWrap}>
            <LinearGradient colors={checkedToday ? ['#E0E6E1', '#E0E6E1'] : G.primaryDeep} start={GS} end={GE} style={styles.streakBtn}>
              <Ionicons name={checkedToday ? 'checkmark-done' : 'flame-outline'} size={15} color={checkedToday ? C.muted : C.white} />
              <Text style={[styles.streakBtnText, checkedToday && { color: C.muted }]}>{checkedToday ? '已打卡' : '打卡'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Card>
      </Appear>

      {/* 今日康复计划 */}
      <Appear delay={150}>
        <SectionHeader num="02" eyebrow="TODAY PLAN" eyebrowColor={C.primaryDeep} title="今日康复计划" subtitle={`已完成 ${planDone.length} / ${DAILY_PLAN.length} 项`} />
        <Card style={styles.planCard}>
          <View style={styles.planHead}>
            <View style={styles.planRingWrap}>
              <ArcMini size={48} pct={planPct / 100} color={C.primary} strokeWidth={5} />
              <Text style={styles.planRingText}>{planPct}%</Text>
            </View>
            <Text style={styles.planHeadText}>{planPct >= 100 ? '今日计划已全部完成，太棒了！' : '完成每日小目标，让康复稳步推进'}</Text>
          </View>
          {DAILY_PLAN.map((item, idx) => {
            const done = planDone.includes(item.id);
            return (
              <TouchableOpacity key={item.id} activeOpacity={0.7} onPress={() => togglePlan(item.id)} style={[styles.planRow, idx !== DAILY_PLAN.length - 1 && styles.rowDivider]}>
                <View style={[styles.planCheck, done && styles.planCheckDone]}>{done && <Ionicons name="checkmark" size={14} color={C.white} />}</View>
                <IconTile icon={item.icon} dim={38} size={18} gradient={item.grad} />
                <View style={[styles.flex, { marginLeft: 12 }]}>
                  <Text style={[styles.planTitle, done && styles.taskTitleDone]}>{item.title}</Text>
                  <Text style={styles.planMeta}>{item.meta}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </Card>
      </Appear>

      <SectionHeader num="03" eyebrow="PATIENTS" title="重点患者" subtitle="今日需要关注的康复进度" action="全部" onAction={() => goTab('training')} />
      {patients[0] && <FeaturedPatient patient={patients[0]} assessments={assessments} records={records} />}
      {patients.slice(1).map((patient) => <PatientRow key={patient.id} patient={patient} />)}

      <SectionHeader num="04" eyebrow="TODAY" eyebrowColor={C.coralDeep} title="今日任务" subtitle={`已完成 ${doneCount} / ${tasks.length}`} />
      <Card style={styles.listCard}>
        {tasks.map((task, index) => {
          const tone = task.priority === '高' ? 'coral' : task.priority === '中' ? 'amber' : 'primary';
          return (
            <TouchableOpacity key={task.id} style={[styles.taskRow, index !== tasks.length - 1 && styles.rowDivider]} onPress={() => toggleTask(task.id)} activeOpacity={0.7}>
              <View style={[styles.checkbox, task.done && styles.checkboxDone]}>{task.done && <Ionicons name="checkmark" size={14} color={C.white} />}</View>
              <View style={styles.flex}>
                <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]}>{task.title}</Text>
                <Text style={styles.taskMeta}>{task.meta}</Text>
              </View>
              <Badge label={task.priority} tone={tone} />
            </TouchableOpacity>
          );
        })}
      </Card>

      <SectionHeader num="05" eyebrow="QUICK FLOW" eyebrowColor={C.amberDeep} title="快捷操作" subtitle="常用工作流一键开始" />
      <View style={styles.quickGrid}>
        {quickActions.map((item, idx) => (
          <Pressable key={item.title} onPress={item.action} style={styles.quickCard}>
            <View style={styles.quickCardHead}>
              <IconTile icon={item.icon} dim={44} gradient={item.gradient} />
              <Text style={styles.quickNum}>{String(idx + 1).padStart(2, '0')}</Text>
            </View>
            <Text style={styles.quickTitle}>{item.title}</Text>
            <Text style={styles.quickCaption}>{item.caption}</Text>
            <View style={styles.quickArrow}>
              <Ionicons name="arrow-forward" size={14} color={C.primaryDeep} />
            </View>
          </Pressable>
        ))}
      </View>

      <SectionHeader num="06" eyebrow="ACHIEVEMENTS" eyebrowColor={'#5E418A'} title="康复成就" subtitle={`已解锁 ${unlockedCount} / ${achievements.length} 枚徽章`} />
      <Card style={styles.achCard}>
        <View style={styles.achRow}>
          {achievements.map((a) => <AchievementBadge key={a.id} icon={a.icon} label={a.label} unlocked={a.unlocked} grad={a.grad} />)}
        </View>
      </Card>

      <SectionHeader num="07" eyebrow="KNOWLEDGE" eyebrowColor={C.amberDeep} title="康复小知识" subtitle="每日一条 · 科学康复" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.knowScroll}>
        {KNOWLEDGE_CARDS.map((k) => (
          <View key={k.id} style={styles.knowCard}>
            <View style={styles.knowHead}>
              <IconTile icon={k.icon} dim={36} size={17} gradient={k.grad} />
              <View style={styles.knowTag}><Text style={styles.knowTagText}>{k.tag}</Text></View>
            </View>
            <Text style={styles.knowTitle}>{k.title}</Text>
            <Text style={styles.knowBody}>{k.body}</Text>
          </View>
        ))}
      </ScrollView>
    </ScrollView>
  );
}

function FeaturedPatient({ patient, assessments, records }) {
  const warn = patient.risk === '中风险';
  const av = avatarOf(patient.name);
  const patientAssess = assessments.find((a) => a.patient === patient.name);
  const patientRecs = records.filter((r) => r.patient === patient.name).slice(0, 6).reverse();
  const trendScores = patientRecs.length ? patientRecs.map((r) => r.score) : [55, 62, 70, 75, 78, 84];
  return (
    <Card style={styles.featuredCard}>
      <View style={styles.featuredHead}>
        <GradientAvatar name={patient.name} dim={56} />
        <View style={[styles.flex, { marginLeft: 14 }]}>
          <Text style={styles.featuredName}>{patient.name}</Text>
          <Text style={styles.featuredMeta}>{patient.diagnosis} · {patient.side} · {patient.stage}</Text>
        </View>
        <Badge label={warn ? '中风险' : '低风险'} tone={warn ? 'amber' : 'primary'} />
      </View>
      <View style={styles.featuredSparkWrap}>
        <View style={styles.flex}>
          <Text style={styles.featuredSparkLabel}>近期评分趋势</Text>
          <SparkLine values={trendScores} color={av.fg} width={Math.min(APP_WIDTH - 120, 200)} height={36} />
        </View>
        <View style={[styles.featuredScoreBox, { backgroundColor: av.grad[0] + '15' }]}>
          <Text style={[styles.featuredScore, { color: av.fg }]}>{patientAssess ? patientAssess.score : trendScores[trendScores.length - 1]}</Text>
          <Text style={[styles.featuredScoreLbl, { color: av.fg }]}>评分</Text>
        </View>
      </View>
      <View style={styles.featuredStats}>
        <View style={styles.featuredStatItem}><Text style={styles.featuredStatValue}>{patient.stage}</Text><Text style={styles.featuredStatLabel}>训练阶段</Text></View>
        <View style={styles.featuredStatDiv} />
        <View style={styles.featuredStatItem}><Text style={styles.featuredStatValue}>{patient.next}</Text><Text style={styles.featuredStatLabel}>下次安排</Text></View>
      </View>
    </Card>
  );
}

function PatientRow({ patient }) {
  const warn = patient.risk === '中风险';
  return (
    <Card style={styles.patientRow}>
      <GradientAvatar name={patient.name} dim={46} />
      <View style={[styles.flex, { marginLeft: 13 }]}>
        <Text style={styles.patientName}>{patient.name}</Text>
        <Text style={styles.patientMeta}>{patient.diagnosis} · {patient.side} · {patient.stage}</Text>
        <View style={styles.patientNextRow}>
          <Ionicons name="time-outline" size={12} color={C.muted} />
          <Text style={styles.patientNext}>下次 {patient.next}</Text>
        </View>
      </View>
      <Badge label={warn ? '中风险' : '低风险'} tone={warn ? 'amber' : 'primary'} />
    </Card>
  );
}

/* ============================ 设备 ============================ */
function DeviceScreen({ devices, setDevices, onBack }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('康复手套');
  const [patient, setPatient] = useState('');
  const onlineCount = devices.filter((item) => item.status === 'online').length;
  const avgBattery = devices.length ? Math.round(devices.reduce((sum, d) => sum + d.battery, 0) / devices.length) : 0;

  const toggleDevice = (id) => {
    setDevices((prev) => prev.map((item) => item.id === id ? {
      ...item, status: item.status === 'online' ? 'standby' : 'online',
      signal: item.status === 'online' ? 18 : 88,
      lastSync: item.status === 'online' ? item.lastSync : '刚刚',
    } : item));
  };
  const syncDevice = (id) => {
    setDevices((prev) => prev.map((item) => item.id === id ? { ...item, lastSync: '刚刚', signal: item.status === 'online' ? 96 : item.signal } : item));
    Alert.alert('同步完成', '设备数据已更新到数据中心。');
  };
  const removeDevice = (id, deviceName) => {
    Alert.alert('删除设备', `确认删除「${deviceName}」？`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => setDevices((prev) => prev.filter((item) => item.id !== id)) },
    ]);
  };
  const addDevice = () => {
    if (!name.trim()) { Alert.alert('提示', '请输入设备名称'); return; }
    setDevices((prev) => [{ id: uid('d'), name: name.trim(), type, status: 'online', battery: 100, signal: 92, patient: patient.trim() || '未绑定', lastSync: '刚刚' }, ...prev]);
    setName(''); setPatient(''); setShowAdd(false);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      {!!onBack && (
        <TouchableOpacity onPress={onBack} activeOpacity={0.75} style={styles.backRow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={18} color={C.primaryDeep} />
          <Text style={styles.backText}>返回工作台</Text>
        </TouchableOpacity>
      )}
      <PageHeader num="·" eyebrow="DEVICE CENTER" title="设备管理" subtitle={`在线 ${onlineCount} 台 · 共 ${devices.length} 台`}
        right={(
          <TouchableOpacity activeOpacity={0.85} onPress={() => setShowAdd(true)} style={styles.addButtonWrap}>
            <LinearGradient colors={G.primaryDeep} start={GS} end={GE} style={styles.addButton}>
              <Ionicons name="add" size={26} color={C.white} />
            </LinearGradient>
          </TouchableOpacity>
        )}
      />

      <View style={styles.bigMetricRow}>
        <BigMetricCard num={String(onlineCount)} unit={`/ ${devices.length}`} label="在线设备" arcPct={devices.length ? onlineCount / devices.length : 0} color={C.primary} gradient={G.primary} />
        <BigMetricCard num={avgBattery + ''} unit="%" label="平均电量" arcPct={avgBattery / 100} color={avgBattery > 50 ? C.primary : C.amberDeep} gradient={avgBattery > 50 ? G.primary : G.amber} />
      </View>

      {devices.length === 0 && <EmptyState icon="hardware-chip-outline" title="暂无设备" caption="添加康复手套、角度传感器或肌电设备后，可在这里查看状态。" action="添加设备" onAction={() => setShowAdd(true)} />}
      {devices.length > 0 && <SectionHeader num="·" eyebrow="DEVICES" title="设备列表" subtitle="点击下方按钮可同步或管理" />}
      {devices.map((device) => <DeviceCard key={device.id} device={device} onToggle={() => toggleDevice(device.id)} onSync={() => syncDevice(device.id)} onRemove={() => removeDevice(device.id, device.name)} />)}

      <ModalSheet visible={showAdd} title="添加设备" subtitle="录入后会自动设为在线状态" onClose={() => setShowAdd(false)}>
        <InputField label="设备名称" icon="hardware-chip-outline" value={name} onChangeText={setName} placeholder="例如：智能握力手套 A02" />
        <Text style={styles.inputLabel}>设备类型</Text>
        <View style={styles.chipRow}>{['康复手套', '角度传感器', '肌电设备'].map((item) => <Chip key={item} label={item} active={type === item} onPress={() => setType(item)} />)}</View>
        <InputField label="绑定患者" icon="person-outline" value={patient} onChangeText={setPatient} placeholder="可暂不填写" />
        <PrimaryButton label="保存设备" icon="checkmark" onPress={addDevice} />
      </ModalSheet>
    </ScrollView>
  );
}

function BigMetricCard({ num, unit, label, arcPct, color, gradient }) {
  return (
    <View style={[styles.bigMetric, { flex: 1 }]}>
      <View style={styles.bigMetricHead}>
        <ArcMini size={42} pct={arcPct} color={color} strokeWidth={4} />
        <View style={styles.bigMetricBadge}><Ionicons name="trending-up" size={11} color={color} /></View>
      </View>
      <View style={styles.bigMetricNumRow}>
        <Text style={[styles.bigMetricNum, { color: C.ink }]}>{num}</Text>
        <Text style={[styles.bigMetricUnit, { color: C.muted }]}>{unit}</Text>
      </View>
      <Text style={styles.bigMetricLabel}>{label}</Text>
    </View>
  );
}

function DeviceCard({ device, onToggle, onSync, onRemove }) {
  const online = device.status === 'online';
  const batteryColor = device.battery > 60 ? C.primary : device.battery > 30 ? C.amberDeep : C.coralDeep;
  const batteryGrad = device.battery > 60 ? G.primary : device.battery > 30 ? G.amber : G.coral;
  const icon = device.type === '肌电设备' ? 'pulse-outline' : device.type === '角度传感器' ? 'navigate-outline' : 'hand-left-outline';
  const iconTone = device.type === '肌电设备' ? 'lavender' : device.type === '角度传感器' ? 'sky' : online ? 'primary' : undefined;
  return (
    <Card style={styles.deviceCard}>
      <View style={styles.deviceTop}>
        <IconTile icon={icon} dim={46} tone={iconTone} gradient={online && iconTone === 'primary' ? G.primary : undefined} />
        <View style={[styles.flex, { marginLeft: 12 }]}>
          <Text style={styles.cardTitle}>{device.name}</Text>
          <Text style={styles.cardMeta}>{device.type} · 绑定 {device.patient}</Text>
        </View>
        <View style={styles.deviceStatusPill}>
          <View style={[styles.statusDot, { backgroundColor: online ? C.primary : C.faint }]} />
          <Text style={[styles.statusPillText, { color: online ? C.primaryDeep : C.muted }]}>{online ? 'LIVE' : '待连接'}</Text>
        </View>
      </View>
      <View style={styles.deviceMetrics}>
        <View style={styles.deviceMetric}>
          <View style={styles.deviceMetricHead}><Text style={styles.deviceMetricLabel}>电量</Text><Text style={[styles.deviceMetricValue, { color: batteryColor }]}>{device.battery}%</Text></View>
          <ProgressBar value={device.battery} gradient={batteryGrad} height={6} />
        </View>
        <View style={styles.deviceMetric}>
          <View style={styles.deviceMetricHead}><Text style={styles.deviceMetricLabel}>信号</Text><Text style={[styles.deviceMetricValue, { color: online ? '#194E85' : C.faint }]}>{device.signal}%</Text></View>
          <ProgressBar value={device.signal} gradient={online ? G.sky : ['#C7CDD4', '#A8B0C2']} height={6} />
        </View>
      </View>
      <Text style={styles.syncText}>上次同步 {device.lastSync}</Text>
      <View style={styles.deviceActions}>
        <TouchableOpacity onPress={onSync} activeOpacity={0.75} style={styles.deviceBtn}><Ionicons name="sync-outline" size={15} color={C.inkSoft} /><Text style={styles.deviceBtnText}>同步</Text></TouchableOpacity>
        <TouchableOpacity onPress={onRemove} activeOpacity={0.75} style={styles.deviceBtn}><Ionicons name="trash-outline" size={15} color={C.coralDeep} /><Text style={[styles.deviceBtnText, { color: C.coralDeep }]}>删除</Text></TouchableOpacity>
        <TouchableOpacity onPress={onToggle} activeOpacity={0.75} style={[styles.deviceBtn, !online && styles.deviceBtnPrimary]}>
          {!online ? <LinearGradient colors={G.primaryDeep} start={GS} end={GE} style={StyleSheet.absoluteFill} /> : null}
          <Ionicons name={online ? 'power-outline' : 'link-outline'} size={15} color={online ? C.inkSoft : C.white} />
          <Text style={[styles.deviceBtnText, !online && styles.deviceBtnTextPrimary]}>{online ? '断开' : '连接'}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

/* ============================ 训练 ============================ */
function TrainingScreen({ patients, setPatients, assessments, setAssessments, prescriptions, setPrescriptions, records, setRecords }) {
  const [subTab, setSubTab] = useState('patients');
  const tabItems = [
    { key: 'patients', label: '患者', icon: 'people-outline' },
    { key: 'assessment', label: '评估', icon: 'clipboard-outline' },
    { key: 'prescription', label: '建议草案', icon: 'medkit-outline' },
    { key: 'game', label: '互动训练', icon: 'game-controller-outline' },
  ];
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <PageHeader num="·" eyebrow="TRAINING" title="训练中心" subtitle="演示档案 · 评估记录 · 建议草案 · 互动训练" />
      <SegmentedControl items={tabItems} value={subTab} onChange={setSubTab} />
      {subTab === 'patients' && <PatientsPanel patients={patients} setPatients={setPatients} />}
      {subTab === 'assessment' && <AssessmentPanel patients={patients} assessments={assessments} setAssessments={setAssessments} />}
      {subTab === 'prescription' && <PrescriptionPanel patients={patients} prescriptions={prescriptions} setPrescriptions={setPrescriptions} />}
      {subTab === 'game' && <GamePanel patients={patients} setRecords={setRecords} records={records} />}
    </ScrollView>
  );
}

function PatientsPanel({ patients, setPatients }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', age: '', diagnosis: '脑卒中恢复期', side: '右手', phone: '' });
  const addPatient = () => {
    if (!form.name.trim() || !form.age.trim()) { Alert.alert('提示', '请填写姓名和年龄'); return; }
    setPatients((prev) => [{ id: uid('p'), name: form.name.trim(), age: form.age.trim(), diagnosis: form.diagnosis, side: form.side, stage: '第1周', risk: '低风险', next: '待安排', phone: form.phone.trim() }, ...prev]);
    setForm({ name: '', age: '', diagnosis: '脑卒中恢复期', side: '右手', phone: '' });
    setShowAdd(false);
  };
  const removePatient = (id, name) => {
    Alert.alert('删除患者档案', `确认删除「${name}」的基础档案？`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => setPatients((prev) => prev.filter((item) => item.id !== id)) },
    ]);
  };
  return (
    <>
      <SectionHeader num="·" eyebrow="PROFILES" title="患者档案" action="新增" onAction={() => setShowAdd(true)} />
      {patients.length === 0 && <EmptyState icon="people-outline" title="暂无演示档案" caption="先建立演示档案，再录入评估记录和训练建议草案。" action="新增档案" onAction={() => setShowAdd(true)} />}
      {patients.map((patient) => {
        const av = avatarOf(patient.name);
        return (
          <Card key={patient.id} style={styles.profileCard}>
            <View style={[styles.profileStripe, { backgroundColor: av.fg }]} />
            <View style={styles.profileTop}>
              <GradientAvatar name={patient.name} dim={54} />
              <View style={[styles.flex, { marginLeft: 13 }]}>
                <Text style={styles.profileName}>{patient.name}</Text>
                <Text style={styles.cardMeta}>{patient.age} 岁 · {patient.diagnosis}</Text>
              </View>
              <Badge label={patient.risk === '中风险' ? '中风险' : '低风险'} tone={patient.risk === '中风险' ? 'amber' : 'primary'} />
            </View>
            <View style={styles.infoGrid}>
              <InfoCell label="患侧" value={patient.side} />
              <InfoCell label="阶段" value={patient.stage} />
              <InfoCell label="下次安排" value={patient.next} />
              <InfoCell label="联系方式" value={patient.phone || '未填写'} />
            </View>
            <PrimaryButton label="删除档案" icon="trash-outline" tone="ghost" onPress={() => removePatient(patient.id, patient.name)} />
          </Card>
        );
      })}
      <ModalSheet visible={showAdd} title="新增患者" subtitle="建立患者基础档案" onClose={() => setShowAdd(false)}>
        <InputField label="姓名" icon="person-outline" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="请输入患者姓名" />
        <InputField label="年龄" icon="calendar-outline" value={form.age} onChangeText={(v) => setForm((p) => ({ ...p, age: v }))} placeholder="请输入年龄" keyboardType="numeric" />
        <Text style={styles.inputLabel}>诊断类型</Text>
        <View style={styles.chipRow}>{['脑卒中恢复期', '腕关节术后', '帕金森', '骨折术后'].map((item) => <Chip key={item} label={item} active={form.diagnosis === item} onPress={() => setForm((p) => ({ ...p, diagnosis: item }))} />)}</View>
        <Text style={styles.inputLabel}>患侧</Text>
        <View style={styles.chipRow}>{['左手', '右手', '双手'].map((item) => <Chip key={item} label={item} active={form.side === item} onPress={() => setForm((p) => ({ ...p, side: item }))} />)}</View>
        <InputField label="联系方式" icon="call-outline" value={form.phone} onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))} placeholder="可选" keyboardType="phone-pad" />
        <PrimaryButton label="保存档案" icon="checkmark" onPress={addPatient} />
      </ModalSheet>
    </>
  );
}

function InfoCell({ label, value }) {
  return <View style={styles.infoCell}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

function AssessmentPanel({ patients, assessments, setAssessments }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ patient: patients[0] ? patients[0].name : '', grip: '20', rom: '60', pain: '2', adl: '70', note: '' });
  const addAssessment = () => {
    if (!form.patient.trim()) { Alert.alert('提示', '请选择或输入患者'); return; }
    const grip = Number(form.grip || 0); const rom = Number(form.rom || 0);
    const pain = Number(form.pain || 0); const adl = Number(form.adl || 0);
    setAssessments((prev) => [{ id: uid('a'), patient: form.patient.trim(), date: today, grip, rom, pain, adl, score: scoreAssessment(grip, rom, pain, adl), note: form.note.trim() || '已保存基础记录；训练安排需由医生或康复师复核。' }, ...prev]);
    setShowAdd(false);
  };
  return (
    <>
      <SectionHeader num="·" eyebrow="ASSESSMENT" title="评估记录" action="新建" onAction={() => setShowAdd(true)} />
      {assessments.map((item) => {
        const tone = scoreTone(item.score);
        return (
          <Card key={item.id} style={styles.itemCard}>
            <View style={styles.itemTopLine}>
              <View style={styles.flex}><Text style={styles.cardTitle}>{item.patient}</Text><Text style={styles.cardMeta}>{item.date} · 综合评分</Text></View>
              <View style={[styles.scoreMedallionWrap, { backgroundColor: tone.bg }]}>
                <ArcMini size={64} pct={item.score / 100} color={tone.fg} track={tone.fg + '20'} strokeWidth={5} />
                <View style={styles.scoreMedallionTextWrap}>
                  <Text style={[styles.scoreMedallionNum, { color: tone.fg }]}>{item.score}</Text>
                </View>
              </View>
            </View>
            <View style={styles.miniStrip}>
              <MiniStat label="握力" value={item.grip + 'kg'} accent={C.primary} />
              <MiniStat label="活动度" value={item.rom + '%'} accent={C.sky} />
              <MiniStat label="疼痛" value={item.pain + '/10'} accent={C.coral} />
              <MiniStat label="ADL" value={item.adl + '%'} accent={C.lavender} />
            </View>
            <View style={styles.noteWrap}><Ionicons name="bulb-outline" size={14} color={C.amberDeep} /><Text style={styles.noteText}>{item.note}</Text></View>
          </Card>
        );
      })}
      <ModalSheet visible={showAdd} title="新建康复评估" subtitle="录入关键指标后自动计算综合评分" onClose={() => setShowAdd(false)}>
        <Text style={styles.inputLabel}>患者</Text>
        <View style={styles.chipRow}>{patients.map((patient) => <Chip key={patient.id} label={patient.name} active={form.patient === patient.name} onPress={() => setForm((p) => ({ ...p, patient: patient.name }))} />)}</View>
        <InputField label="握力 kg" icon="barbell-outline" value={form.grip} onChangeText={(v) => setForm((p) => ({ ...p, grip: v }))} keyboardType="numeric" placeholder="例如 20" />
        <InputField label="关节活动度 %" icon="navigate-outline" value={form.rom} onChangeText={(v) => setForm((p) => ({ ...p, rom: v }))} keyboardType="numeric" placeholder="0-100" />
        <InputField label="疼痛评分" icon="alert-circle-outline" value={form.pain} onChangeText={(v) => setForm((p) => ({ ...p, pain: v }))} keyboardType="numeric" placeholder="0-10" />
        <InputField label="日常生活能力 %" icon="home-outline" value={form.adl} onChangeText={(v) => setForm((p) => ({ ...p, adl: v }))} keyboardType="numeric" placeholder="0-100" />
        <InputField label="备注" icon="create-outline" value={form.note} onChangeText={(v) => setForm((p) => ({ ...p, note: v }))} placeholder="可选" />
        <PrimaryButton label="保存评估" icon="checkmark" onPress={addAssessment} />
      </ModalSheet>
    </>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <View style={styles.miniStat}>
      {!!accent && <View style={[styles.miniDot, { backgroundColor: accent }]} />}
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function PrescriptionPanel({ patients, prescriptions, setPrescriptions }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ patient: patients[0] ? patients[0].name : '', focus: '抓握稳定性', intensity: '中等', duration: '15' });
  const addPrescription = () => {
    if (!form.patient.trim()) { Alert.alert('提示', '请选择患者'); return; }
    setPrescriptions((prev) => [{ id: uid('rx'), patient: form.patient.trim(), title: form.focus + '训练方案', intensity: form.intensity, frequency: form.intensity === '轻柔' ? '每日 3 次' : '每日 2 次', duration: (form.duration || 15) + ' 分钟', status: '待确认', focus: form.focus }, ...prev]);
    setShowAdd(false);
  };
  const toggleStatus = (id) => setPrescriptions((prev) => prev.map((item) => item.id === id ? { ...item, status: item.status === '执行中' ? '已暂停' : '执行中' } : item));
  return (
    <>
      <SectionHeader num="·" eyebrow="DRAFT" title="训练建议草案" action="新建草案" onAction={() => setShowAdd(true)} />
      {prescriptions.map((item) => {
        const running = item.status === '执行中';
        return (
          <Card key={item.id} style={styles.itemCard}>
            <View style={styles.itemTopLine}>
              <IconTile icon="medkit-outline" dim={46} gradient={G.coral} />
              <View style={[styles.flex, styles.itemTopText]}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardMeta}>{item.patient} · {item.focus}</Text></View>
              <Badge label={item.status} tone={running ? 'primary' : 'amber'} />
            </View>
            <View style={styles.miniStrip}>
              <MiniStat label="强度" value={item.intensity} accent={C.amber} />
              <MiniStat label="频次" value={item.frequency} accent={C.sky} />
              <MiniStat label="时长" value={item.duration} accent={C.primary} />
            </View>
            <PrimaryButton label={running ? '暂停记录' : '确认后开始'} icon={running ? 'pause' : 'play'} tone={running ? 'ghost' : 'primary'} onPress={() => toggleStatus(item.id)} />
          </Card>
        );
      })}
      <ModalSheet visible={showAdd} title="新建训练建议草案" subtitle="规则整理结果必须由医生或康复师确认" onClose={() => setShowAdd(false)}>
        <Text style={styles.inputLabel}>患者</Text>
        <View style={styles.chipRow}>{patients.map((patient) => <Chip key={patient.id} label={patient.name} active={form.patient === patient.name} onPress={() => setForm((p) => ({ ...p, patient: patient.name }))} />)}</View>
        <Text style={styles.inputLabel}>训练重点</Text>
        <View style={styles.chipRow}>{['抓握稳定性', '手指分离', '腕部活动度', '精细动作'].map((item) => <Chip key={item} label={item} active={form.focus === item} onPress={() => setForm((p) => ({ ...p, focus: item }))} />)}</View>
        <Text style={styles.inputLabel}>训练强度</Text>
        <View style={styles.chipRow}>{['轻柔', '中等', '进阶'].map((item) => <Chip key={item} label={item} active={form.intensity === item} onPress={() => setForm((p) => ({ ...p, intensity: item }))} />)}</View>
        <InputField label="单次时长（分钟）" icon="time-outline" value={form.duration} onChangeText={(v) => setForm((p) => ({ ...p, duration: v }))} keyboardType="numeric" placeholder="15" />
        <PrimaryButton label="生成建议草案" icon="sparkles" onPress={addPrescription} />
      </ModalSheet>
    </>
  );
}

function GamePanel({ patients, setRecords, records }) {
  const [patient, setPatient] = useState(patients[0] ? patients[0].name : '李明');
  const [duration, setDuration] = useState(30);
  const [left, setLeft] = useState(30);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [grip, setGrip] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    if (!running) return undefined;
    if (left <= 0) {
      setRunning(false);
      setBest((prev) => Math.max(prev, score));
      setRecords((prev) => [{ id: uid('r'), patient, type: '抓握游戏', date: today, duration: Math.round(duration / 60) || 1, completion: clamp(Math.round(score / duration * 12), 0, 100), score: clamp(score, 0, 100) }, ...prev]);
      return undefined;
    }
    const timer = setInterval(() => setLeft((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [running, left, score, duration, patient, setRecords]);

  const start = () => { setLeft(duration); setScore(0); setGrip(0); setCombo(0); setRunning(true); };
  const tapGrip = () => {
    if (!running) { Alert.alert('提示', '请先点击开始训练'); return; }
    const gain = Math.floor(5 + Math.random() * 9);
    setGrip(clamp(35 + gain * 6 + combo * 2, 0, 100));
    setCombo((prev) => prev + 1);
    setScore((prev) => clamp(prev + gain, 0, 120));
  };
  const progress = clamp(Math.round((duration - left) / duration * 100), 0, 100);

  return (
    <>
      <SectionHeader num="·" eyebrow="LIVE" eyebrowColor={C.amberDeep} title="互动抓握训练" subtitle="点击训练区模拟握力采集" />
      <Card style={styles.gameCard}>
        <View style={styles.gameTopRow}>
          <View style={styles.gameTopLeft}>
            <ArcMini size={64} pct={progress / 100} color={C.primary} strokeWidth={5} />
            <View style={styles.gameTopOver}>
              <Text style={styles.gameTopTime}>{left}</Text>
            </View>
          </View>
          <View style={[styles.flex, { marginLeft: 14 }]}>
            <Text style={styles.gamePatient}>{patient}</Text>
            <Text style={styles.cardMeta}>已记录 {records.length} 条 · {progress}% 完成</Text>
            <View style={styles.gameRowChip}>
              <Text style={styles.gameRowChipText}>本轮剩余 {left}s</Text>
            </View>
          </View>
          <View style={styles.gameScoreColumn}>
            <Text style={styles.gameScoreNum}>{score}</Text>
            <Text style={styles.gameScoreLabel}>得分</Text>
          </View>
        </View>

        <Text style={styles.inputLabel}>训练患者</Text>
        <View style={styles.chipRow}>{patients.map((item) => <Chip key={item.id} label={item.name} active={patient === item.name} onPress={() => setPatient(item.name)} />)}</View>
        <Text style={styles.inputLabel}>训练时长</Text>
        <View style={styles.chipRow}>{[30, 60, 90].map((item) => <Chip key={item} label={item + 's'} active={duration === item} onPress={() => { setDuration(item); setLeft(item); }} />)}</View>

        <TouchableOpacity activeOpacity={0.9} onPress={tapGrip} style={styles.gripPadWrap}>
          <LinearGradient colors={running ? G.primary : G.primaryDeep} start={GS} end={GE} style={styles.gripPad}>
            <Svg width="100%" height="100%" viewBox="0 0 300 200" style={StyleSheet.absoluteFill}>
              <Defs>
                <SvgRG id="gripRG" cx="0.5" cy="0.5" r="0.7">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.18" />
                  <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </SvgRG>
              </Defs>
              <Circle cx="240" cy="40" r="80" fill="url(#gripRG)" />
              <Circle cx="60" cy="170" r="60" fill="url(#gripRG)" opacity="0.6" />
            </Svg>
            <View style={styles.gripIconWrap}><Ionicons name="hand-left" size={42} color={C.white} /></View>
            <Text style={styles.gripTitle}>{running ? '连续点击模拟握力' : '点击开始后进行训练'}</Text>
            <Text style={styles.gripSub}>当前强度 {grip}% · 连击 {combo}</Text>
            <View style={styles.gripBar}><View style={[styles.gripBarFill, { width: grip + '%' }]} /></View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.miniStrip}>
          <MiniStat label="最佳成绩" value={best + ' 分'} accent={C.primary} />
          <MiniStat label="完成度" value={progress + '%'} accent={C.sky} />
          <MiniStat label="节奏" value={combo > 8 ? '稳定' : '热身'} accent={C.amber} />
        </View>
        <View style={styles.btnRow}>
          <PrimaryButton label="开始训练" icon="play" onPress={start} style={styles.flex} />
          <View style={styles.btnGap} />
          <PrimaryButton label="暂停" icon="pause" tone="ghost" onPress={() => setRunning(false)} style={styles.flex} />
        </View>
      </Card>
    </>
  );
}

/* ============================ 数据 ============================ */
function DataScreen({ records, setRecords, reports, setReports, storage }) {
  const [subTab, setSubTab] = useState('records');
  const [showRecord, setShowRecord] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [viewReport, setViewReport] = useState(null);
  const [recordForm, setRecordForm] = useState({ patient: '李明', type: '抓握训练', duration: '15', score: '80' });
  const [reportForm, setReportForm] = useState({ patient: '李明', title: '阶段康复报告', summary: '' });
  const tabItems = [
    { key: 'records', label: '记录', icon: 'list-outline' },
    { key: 'reports', label: '报告', icon: 'document-text-outline' },
    { key: 'analytics', label: '分析', icon: 'bar-chart-outline' },
    { key: 'storage', label: '仓储', icon: 'folder-open-outline' },
  ];
  const addRecord = () => {
    setRecords((prev) => [{ id: uid('r'), patient: recordForm.patient.trim() || '未命名', type: recordForm.type.trim() || '训练记录', date: today, duration: Number(recordForm.duration || 0), completion: clamp(Number(recordForm.score || 0) + 8, 0, 100), score: clamp(Number(recordForm.score || 0), 0, 100) }, ...prev]);
    setShowRecord(false);
  };
  const addReport = () => {
    setReports((prev) => [{ id: uid('rp'), patient: reportForm.patient.trim() || '未命名', title: reportForm.title.trim() || '训练记录摘要', date: today, status: '草案', summary: reportForm.summary.trim() || '这是新建的记录摘要草案，尚未包含专业医疗判断；请结合原始记录并交由医生或康复师复核。' }, ...prev]);
    setShowReport(false);
  };
  const removeRecord = (id) => {
    Alert.alert('删除训练记录', '确认删除这条训练记录？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => setRecords((prev) => prev.filter((item) => item.id !== id)) },
    ]);
  };
  const removeReport = (id) => {
    Alert.alert('删除康复报告', '确认删除这份报告？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => setReports((prev) => prev.filter((item) => item.id !== id)) },
    ]);
  };
  const exportReport = (report) => {
    const markdown = buildReportMarkdown(report);
    if (Platform.OS === 'web' && typeof document !== 'undefined' && typeof URL !== 'undefined') {
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = reportFileName(report);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      Alert.alert('导出成功', `已下载 ${reportFileName(report)}`);
      return;
    }
    setViewReport({ ...report, exportedMarkdown: markdown });
    Alert.alert('已生成导出内容', '非 Web 端已生成 Markdown 文本，并在报告详情中展示。你可以选择文字后交给系统分享或保存工具。');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <PageHeader num="·" eyebrow="DATA HUB" title="数据中心" subtitle="训练记录 · 康复报告 · 趋势分析" />
      <SegmentedControl items={tabItems} value={subTab} onChange={setSubTab} />
      {subTab === 'records' && <RecordsPanel records={records} onAdd={() => setShowRecord(true)} onRemove={removeRecord} />}
      {subTab === 'reports' && <ReportsPanel reports={reports} onAdd={() => setShowReport(true)} onView={setViewReport} onExport={exportReport} onRemove={removeReport} />}
      {subTab === 'analytics' && <AnalyticsPanel records={records} reports={reports} />}
      {subTab === 'storage' && <StoragePanel storage={storage} />}
      <ModalSheet visible={showRecord} title="新增训练记录" subtitle="手动补录线下训练数据" onClose={() => setShowRecord(false)}>
        <InputField label="患者" icon="person-outline" value={recordForm.patient} onChangeText={(v) => setRecordForm((p) => ({ ...p, patient: v }))} placeholder="患者姓名" />
        <InputField label="训练类型" icon="barbell-outline" value={recordForm.type} onChangeText={(v) => setRecordForm((p) => ({ ...p, type: v }))} placeholder="例如：抓握训练" />
        <InputField label="训练时长（分钟）" icon="time-outline" value={recordForm.duration} onChangeText={(v) => setRecordForm((p) => ({ ...p, duration: v }))} keyboardType="numeric" placeholder="分钟" />
        <InputField label="训练得分" icon="ribbon-outline" value={recordForm.score} onChangeText={(v) => setRecordForm((p) => ({ ...p, score: v }))} keyboardType="numeric" placeholder="0-100" />
        <PrimaryButton label="保存记录" icon="checkmark" onPress={addRecord} />
      </ModalSheet>
      <ModalSheet visible={showReport} title="生成康复报告" subtitle="根据现有记录快速生成阶段总结" onClose={() => setShowReport(false)}>
        <InputField label="患者" icon="person-outline" value={reportForm.patient} onChangeText={(v) => setReportForm((p) => ({ ...p, patient: v }))} placeholder="患者姓名" />
        <InputField label="报告标题" icon="document-text-outline" value={reportForm.title} onChangeText={(v) => setReportForm((p) => ({ ...p, title: v }))} placeholder="例如：第4周康复报告" />
        <InputField label="摘要" icon="create-outline" value={reportForm.summary} onChangeText={(v) => setReportForm((p) => ({ ...p, summary: v }))} placeholder="可留空自动生成" />
        <PrimaryButton label="生成报告" icon="sparkles" onPress={addReport} />
      </ModalSheet>
      <ModalSheet visible={!!viewReport} title="报告详情" subtitle={viewReport ? viewReport.date : ''} onClose={() => setViewReport(null)}>
        {!!viewReport && (
          <View>
            <Text style={styles.modalReportTitle}>{viewReport.title}</Text>
            <View style={styles.infoGrid}>
              <InfoCell label="患者" value={viewReport.patient} />
              <InfoCell label="状态" value={viewReport.status} />
            </View>
            <View style={styles.noteWrap}><Ionicons name="reader-outline" size={14} color={C.primaryDeep} /><Text style={styles.noteText}>{viewReport.summary}</Text></View>
            {!!viewReport.exportedMarkdown && (
              <View style={styles.exportPreview}>
                <Text style={styles.exportPreviewLabel}>MARKDOWN 导出内容</Text>
                <Text selectable style={styles.exportPreviewText}>{viewReport.exportedMarkdown}</Text>
              </View>
            )}
            <PrimaryButton label="关闭" icon="checkmark" onPress={() => setViewReport(null)} />
          </View>
        )}
      </ModalSheet>
    </ScrollView>
  );
}

function RecordsPanel({ records, onAdd, onRemove }) {
  return (
    <>
      <SectionHeader num="·" eyebrow="RECORDS" title="训练记录" action="新增" onAction={onAdd} />
      {records.length === 0 && <EmptyState icon="list-outline" title="暂无训练记录" caption="新增训练记录或完成一次互动训练后，这里会自动展示完成率和得分。" action="新增记录" onAction={onAdd} />}
      {records.map((item) => {
        const tone = scoreTone(item.score);
        return (
          <Card key={item.id} style={styles.itemCard}>
            <View style={styles.itemTopLine}>
              <IconTile icon="barbell-outline" dim={44} gradient={G.amber} />
              <View style={[styles.flex, styles.itemTopText]}><Text style={styles.cardTitle}>{item.patient}</Text><Text style={styles.cardMeta}>{item.type} · {item.date}</Text></View>
              <View style={[styles.recordScoreBox, { backgroundColor: tone.bg }]}>
                <Text style={[styles.recordScoreNumber, { color: tone.fg }]}>{item.score}</Text>
                <Text style={[styles.recordScoreUnit, { color: tone.fg }]}>分</Text>
              </View>
            </View>
            <View style={styles.recordBottom}>
              <Text style={styles.recordMeta}>训练 {item.duration} 分钟</Text>
              <View style={styles.flex}><ProgressBar value={item.completion} gradient={tone.grad} /></View>
              <Text style={[styles.recordPct, { color: tone.fg }]}>{item.completion}%</Text>
            </View>
            <PrimaryButton label="删除记录" icon="trash-outline" tone="ghost" onPress={() => onRemove(item.id)} />
          </Card>
        );
      })}
    </>
  );
}

function ReportsPanel({ reports, onAdd, onView, onExport, onRemove }) {
  return (
    <>
      <SectionHeader num="·" eyebrow="REPORTS" title="康复报告" action="生成" onAction={onAdd} />
      {reports.length === 0 && <EmptyState icon="document-text-outline" title="暂无康复报告" caption="可以根据当前训练记录生成阶段报告，用于康复复盘和随访归档。" action="生成报告" onAction={onAdd} />}
      {reports.map((item) => (
        <Card key={item.id} style={styles.itemCard}>
          <View style={styles.itemTopLine}>
            <IconTile icon="document-text-outline" dim={46} gradient={G.lavender} />
            <View style={[styles.flex, styles.itemTopText]}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardMeta}>{item.patient} · {item.date}</Text></View>
            <Badge label={item.status} tone={item.status === '已生成' ? 'primary' : 'amber'} />
          </View>
          <View style={styles.noteWrap}><Ionicons name="reader-outline" size={14} color={'#5E418A'} /><Text style={styles.noteText}>{item.summary}</Text></View>
          <View style={styles.btnRow}>
            <PrimaryButton label="查看" icon="eye-outline" tone="ghost" onPress={() => onView(item)} style={styles.flex} />
            <View style={styles.btnGap} />
            <PrimaryButton label="导出 Markdown" icon="download-outline" onPress={() => onExport(item)} style={styles.flex} />
          </View>
          <PrimaryButton label="删除报告" icon="trash-outline" tone="ghost" onPress={() => onRemove(item.id)} style={styles.topGap} />
        </Card>
      ))}
    </>
  );
}

function AnalyticsPanel({ records, reports }) {
  const avgScore = records.length ? Math.round(records.reduce((sum, item) => sum + item.score, 0) / records.length) : 0;
  const avgCompletion = records.length ? Math.round(records.reduce((sum, item) => sum + item.completion, 0) / records.length) : 0;
  const totalMinutes = records.reduce((sum, item) => sum + item.duration, 0);
  const chart = records.slice(0, 7).reverse();
  const peak = chart.reduce((max, item) => Math.max(max, item.score), 1);
  const trendValues = chart.map((c) => c.score);
  return (
    <>
      <SectionHeader num="·" eyebrow="ANALYTICS" title="趋势分析" subtitle="根据训练记录实时汇总" />

      <Card style={styles.analyticsHero}>
        <View style={styles.analyticsHeroTop}>
          <View>
            <NumberedEyebrow num="·" label="OVERALL" />
            <View style={styles.bigMetricNumRow}>
              <Text style={styles.analyticsHugeNum}>{avgScore}</Text>
              <Text style={styles.analyticsHugeUnit}>分</Text>
            </View>
            <Text style={styles.analyticsHugeLabel}>训练平均分</Text>
          </View>
          <View style={styles.analyticsTrend}>
            <SparkLine values={trendValues.length ? trendValues : [60, 65, 70, 75, 72, 80, 85]} color={C.primaryDeep} width={130} height={50} />
            <View style={styles.analyticsTrendChip}>
              <Ionicons name="trending-up" size={11} color={C.primaryDeep} />
              <Text style={styles.analyticsTrendText}>+5</Text>
            </View>
          </View>
        </View>
        {chart.length === 0 ? (
          <Text style={styles.chartEmpty}>暂无可分析的训练记录。</Text>
        ) : (
          <View style={styles.barChart}>
            {chart.map((item) => (
              <View key={item.id} style={styles.barItem}>
                <Text style={styles.barValue}>{item.score}</Text>
                <GradientBar height={clamp(Math.round(item.score / peak * 110), 14, 110)} width={20} colors={G.primary} />
                <Text style={styles.barLabel}>{item.patient.slice(0, 1)}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <View style={styles.bigMetricRow}>
        <BigMetricCard num={avgCompletion + ''} unit="%" label="完成率" arcPct={avgCompletion / 100} color={C.primary} gradient={G.primary} />
        <BigMetricCard num={String(totalMinutes)} unit="min" label="总时长" arcPct={Math.min(1, totalMinutes / 120)} color={'#194E85'} gradient={G.sky} />
      </View>
      <View style={styles.bigMetricRow}>
        <BigMetricCard num={String(reports.length)} unit="份" label="报告" arcPct={Math.min(1, reports.length / 5)} color={'#5E418A'} gradient={G.lavender} />
        <BigMetricCard num={String(records.length)} unit="次" label="训练" arcPct={Math.min(1, records.length / 10)} color={C.amberDeep} gradient={G.amber} />
      </View>
    </>
  );
}

function StoragePanel({ storage }) {
  const [filter, setFilter] = useState('全部');
  const list = filter === '全部' ? storage : storage.filter((item) => item.type === filter);
  return (
    <>
      <SectionHeader num="·" eyebrow="STORAGE" title="数据仓储" subtitle="原始数据、模板与归档文档" />
      <View style={styles.chipRow}>{['全部', '模板', '数据', '文档'].map((item) => <Chip key={item} label={item} active={filter === item} onPress={() => setFilter(item)} />)}</View>
      {list.map((item) => {
        const tone = item.type === '数据' ? 'sky' : item.type === '模板' ? 'lavender' : 'amber';
        const icon = item.type === '数据' ? 'server-outline' : item.type === '模板' ? 'copy-outline' : 'document-outline';
        return (
          <Card key={item.id} style={styles.storageCard}>
            <IconTile icon={icon} dim={46} tone={tone} />
            <View style={[styles.flex, { marginLeft: 12 }]}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardMeta}>{item.type} · {item.owner} · {item.updated}</Text></View>
            <Text style={styles.storageSize}>{item.size}</Text>
          </Card>
        );
      })}
    </>
  );
}

/* ============================ 我的 ============================ */
function ProfileScreen({ user, setUser, onLogout, onDeleteAccount, onUpdateUser, aiConfig, setAiConfig }) {
  const [showEdit, setShowEdit] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [showAiConfig, setShowAiConfig] = useState(false);
  const [draft, setDraft] = useState({ name: user.name, role: user.role });
  const saveProfile = async () => {
    const next = { ...user, name: draft.name.trim() || user.name, role: draft.role.trim() || user.role };
    try {
      if (onUpdateUser) await onUpdateUser(next);
      else setUser(next);
      setShowEdit(false);
    } catch (error) { Alert.alert('保存失败', error.message || '请稍后重试。'); }
  };
  const confirmDeleteAccount = () => {
    Alert.alert('确认注销账号', '此操作会永久删除当前账号和保存的患者档案、训练记录、报告、设备数据。删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      { text: '确认删除', style: 'destructive', onPress: onDeleteAccount },
    ]);
  };
  const av = avatarOf(user.name);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.profileHeroWrap, SHADOW.hero]}>
        <Svg width="100%" height="100%" viewBox="0 0 400 220" style={StyleSheet.absoluteFill} preserveAspectRatio="xMidYMid slice">
          <Defs>
            <SvgLG id="profileHeroBg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={av.grad[0]} />
              <Stop offset="1" stopColor={av.grad[1]} />
            </SvgLG>
            <SvgRG id="profileHeroBlob" cx="0.85" cy="0.15" r="0.55">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.30" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </SvgRG>
          </Defs>
          <Rect x="0" y="0" width="400" height="220" fill="url(#profileHeroBg)" />
          <Rect x="0" y="0" width="400" height="220" fill="url(#profileHeroBlob)" />
          {/* decorative arcs */}
          <Circle cx="350" cy="40" r="80" stroke="#FFFFFF" strokeOpacity="0.12" strokeWidth="1" fill="none" />
          <Circle cx="350" cy="40" r="55" stroke="#FFFFFF" strokeOpacity="0.10" strokeWidth="1" fill="none" />
          <Circle cx="40" cy="200" r="60" stroke="#FFFFFF" strokeOpacity="0.10" strokeWidth="1" fill="none" />
        </Svg>
        <View style={styles.profileHeroBody}>
          <View style={styles.profileAvatarRing}>
            <GradientAvatar name={user.name} dim={64} textSize={26} />
          </View>
          <View style={[styles.flex, { marginLeft: 14 }]}>
            <Text style={styles.profileHeroName}>{user.name}</Text>
            <View style={styles.profileHeroTagRow}>
              <View style={styles.profileHeroTag}><Text style={styles.profileHeroTagText}>{user.role}</Text></View>
              <Text style={styles.profileHeroEmail}>健康守护者 v1.0</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.profileEditBtn} activeOpacity={0.8} onPress={() => setShowEdit(true)}>
            <Ionicons name="create-outline" size={18} color={C.white} />
          </TouchableOpacity>
        </View>
      </View>

      <SectionHeader num="·" eyebrow="ACCOUNT" title="账号服务" />
      <Card style={styles.menuCard}>
        <ProfileMenu icon="person-circle-outline" tone="primary" title="个人资料" caption="姓名、身份与联系方式" onPress={() => setShowEdit(true)} />
        <ProfileMenu icon="lock-closed-outline" tone="sky" title="密码与安全" caption="管理登录方式与账号安全" onPress={() => Alert.alert('安全中心', '可在账号服务中管理登录凭证和安全策略。')} />
        <ProfileMenu icon="save-outline" tone="lavender" title="数据保存边界" caption="默认本机保存 · 可选服务端账号" onPress={() => Alert.alert('数据保存边界', 'Web 端通过 AsyncStorage 适配保存到 localStorage，原生端使用 AsyncStorage；持久存储不可用时仅在当前运行内存保留。只有选择并成功登录可选服务端账号时，工作区数据才会提交到该服务端。本作品不声明医疗合规认证或云端备份保证。')} last />
      </Card>

      <SectionHeader num="·" eyebrow="AI ASSISTANT" eyebrowColor={C.primaryDeep} title="AI 助手" />
      <Card style={styles.menuCard}>
        <ProfileMenu icon="sparkles-outline" tone="primary" title="连接 AI 模型" caption={aiConfig && aiConfigured(aiConfig) ? `已连接 ${(AI_PROVIDERS.find((p) => p.id === aiConfig.provider) || {}).name || '自定义'} · ${aiConfig.model}` : '自带 API Key · 仅保存在本机'} onPress={() => setShowAiConfig(true)} last />
      </Card>

      <SectionHeader num="·" eyebrow="DATA & REMINDERS" eyebrowColor={'#194E85'} title="数据与提醒说明" />
      <Card style={styles.menuCard}>
        <ProfileMenu icon="phone-portrait-outline" tone="primary" title="本机工作区" caption="自动保存；失败时退回当前运行内存" onPress={() => Alert.alert('本机工作区', '浏览器使用 localStorage，原生端使用 AsyncStorage。若存储被拒绝，则仅在当前运行内存中保留，刷新或关闭后可能丢失。')} />
        <ProfileMenu icon="server-outline" tone="sky" title="可选服务端账号" caption="仅主动登录成功后同步" onPress={() => Alert.alert('可选服务端账号', '只有用户选择并成功登录可选服务端账号时，数据才会提交到项目服务端；本作品不承诺持续在线或备份。')} />
        <ProfileMenu icon="notifications-outline" tone="amber" title="应用内提醒" caption="待办和今日计划保存在当前工作区" onPress={() => Alert.alert('应用内提醒', '这里展示应用内待办和今日计划；当前演示未声明已接入系统推送通知。')} last />
      </Card>

      <SectionHeader num="·" eyebrow="BOUNDARIES" eyebrowColor={'#5E418A'} title="边界与更多" />
      <Card style={styles.menuCard}>
        <ProfileMenu icon="information-circle-outline" tone="sky" title="关于应用" caption="版本、版权与产品说明" onPress={() => setShowAbout(true)} />
        <ProfileMenu icon="shield-checkmark-outline" tone="primary" title="隐私政策" caption="查看信息收集、保存和删除说明" onPress={() => setShowPrivacy(true)} />
        <ProfileMenu icon="reader-outline" tone="lavender" title="用户协议" caption="查看服务范围和健康提示" onPress={() => setShowAgreement(true)} />
        <ProfileMenu icon="trash-outline" tone="coral" title="注销账号与删除数据" caption="删除当前账号和关联数据" onPress={confirmDeleteAccount} danger />
        <ProfileMenu icon="log-out-outline" tone="coral" title="退出登录" caption="返回登录页" onPress={onLogout} danger last />
      </Card>
      <Text style={styles.versionText}>健康守护者　版本 1.0.0</Text>

      <ModalSheet visible={showEdit} title="编辑资料" subtitle="资料会用于工作台和个人中心展示" onClose={() => setShowEdit(false)}>
        <InputField label="姓名" icon="person-outline" value={draft.name} onChangeText={(v) => setDraft((p) => ({ ...p, name: v }))} placeholder="姓名" />
        <InputField label="身份" icon="briefcase-outline" value={draft.role} onChangeText={(v) => setDraft((p) => ({ ...p, role: v }))} placeholder="身份" />
        <PrimaryButton label="保存资料" icon="checkmark" onPress={saveProfile} />
      </ModalSheet>
      <ModalSheet visible={showAbout} title="关于健康守护者" subtitle="版本 1.0.0" onClose={() => setShowAbout(false)}>
        <View style={styles.aboutMark}>
          <HeroMedallion size={110} pct={0.78} />
          <Text style={styles.aboutName}>健康守护者</Text>
        </View>
        <Text style={styles.detailParagraph}>健康守护者是个人作品演示，展示虚构档案、设备状态、评估记录、训练建议草案、互动训练、趋势摘要、账号与删除闭环。</Text>
        <Text style={styles.detailParagraph}>以下患者、训练与设备数据均为虚构演示数据；它们不代表真实用户、医疗结论、临床验证或运营成果。</Text>
        <Text style={styles.detailParagraph}>本作品不提供诊断，不能替代医生或康复师，也不用于急救。紧急情况请立即联系当地急救服务。</Text>
        <PrimaryButton label="我知道了" icon="checkmark" onPress={() => setShowAbout(false)} />
      </ModalSheet>
      <ModalSheet visible={showPrivacy} title="隐私政策" subtitle="隐私与数据说明" onClose={() => setShowPrivacy(false)}>
        <Text style={styles.detailParagraph}>默认工作区在 Web 端通过 AsyncStorage 适配保存到 localStorage，原生端使用 AsyncStorage；持久存储不可用时仅保存在当前运行内存，刷新或关闭后可能丢失。</Text>
        <Text style={styles.detailParagraph}>只有你选择并成功登录可选服务端账号时，账号与工作区数据才会提交到该服务端。演示部署不承诺医疗合规认证、云端备份或持续可用性。</Text>
        <Text style={styles.detailParagraph}>配置第三方 AI 后，对话与所选记录会发送给对应服务商或你填写的代理。请勿在公开演示中输入真实敏感医疗数据。</Text>
        <Text style={styles.detailParagraph}>你可以在“我的 - 注销账号与删除数据”清除本地工作区，或请求删除可选服务端账号及关联记录。</Text>
        <PrimaryButton label="关闭" icon="checkmark" onPress={() => setShowPrivacy(false)} />
      </ModalSheet>
      <ModalSheet visible={showAgreement} title="用户协议" subtitle="服务范围与健康提示" onClose={() => setShowAgreement(false)}>
        <Text style={styles.detailParagraph}>健康守护者提供记录整理、设备状态演示、评估数据录入、训练建议草案、互动训练和阶段摘要等作品演示能力。</Text>
        <Text style={styles.detailParagraph}>本应用不提供诊断；训练建议草案不能替代医生或康复师，也不用于急救。紧急情况请立即联系当地急救服务。</Text>
        <Text style={styles.detailParagraph}>用户应确保录入信息合法，并由专业人员决定训练或治疗安排。</Text>
        <PrimaryButton label="同意并关闭" icon="checkmark" onPress={() => setShowAgreement(false)} />
      </ModalSheet>
      {!!aiConfig && <AiConfigModal visible={showAiConfig} config={aiConfig} onClose={() => setShowAiConfig(false)} onSave={(cfg) => { setAiConfig(cfg); setShowAiConfig(false); }} />}
    </ScrollView>
  );
}

function ProfileMenu({ icon, tone, title, caption, onPress, last, danger }) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.profileMenu, !last && styles.rowDivider]}>
      <IconTile icon={icon} dim={40} size={20} tone={danger ? 'coral' : tone} />
      <View style={[styles.flex, { marginLeft: 12 }]}>
        <Text style={[styles.profileMenuTitle, danger && { color: C.coralDeep }]}>{title}</Text>
        <Text style={styles.profileMenuCaption}>{caption}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.faint} />
    </TouchableOpacity>
  );
}

/* ============================ AI 康复助手 ============================ */
const AI_QUICKS = [
  {
    id: 'points', label: '整理记录要点', icon: 'school-outline',
    prompt: '请说明如何把手功能训练记录整理成便于医生或康复师复核的摘要，不提供诊断或具体处方。',
    demo: '## 记录整理要点\n- 保留日期、动作、时长、主观感受和异常情况。\n- 区分原始录入、趋势计算与专业人员结论。\n- 将缺失字段列为待确认项，不自行补全。\n- 出现疼痛加重、肿胀或其他异常时，记录发生时间并联系专业人员。\n> 本内容由本地演示规则生成，仅用于记录整理，不提供诊断，不能替代医生或康复师，也不用于急救。',
  },
  {
    id: 'adherence', label: '提升依从性', icon: 'heart-circle-outline',
    prompt: '请提供不涉及医疗决策的训练记录习惯建议，并提醒训练安排需由专业人员确认。',
    demo: '## 记录习惯建议\n- 把已由专业人员确认的计划拆成每日勾选项。\n- 每次只记录实际完成情况，不把目标当成结果。\n- 记录中断原因和异常感受，复诊时一并提供。\n- 家属可协助记录，但不应自行调整专业计划。\n> 本内容由本地演示规则生成，仅用于记录整理；训练安排由医生或康复师确认。',
  },
  {
    id: 'grip', label: '握力记录复核', icon: 'barbell-outline',
    prompt: '请把握力记录整理成待医生或康复师复核的问题清单，不提供训练处方。',
    demo: '## 待复核清单\n1. 测量工具、姿势和时间是否一致？\n2. 是否记录左右侧、疼痛或疲劳情况？\n3. 数值变化是否连续，还是只有单次测量？\n4. 下一步训练强度、频次和动作应由医生或康复师结合面诊决定。\n> 单次记录不能用于诊断；本助手不提供治疗安排。',
  },
  {
    id: 'safety', label: '居家注意事项', icon: 'shield-checkmark-outline',
    prompt: '请给出通用安全记录提醒，并明确紧急情况应联系当地急救服务。',
    demo: '## 通用安全记录提醒\n- 只执行医生或康复师已经确认的训练安排。\n- 记录训练前后出现的疼痛、肿胀、麻木或其他异常。\n- 出现异常时停止自行调整并联系专业人员。\n- 如出现紧急或快速恶化的症状，立即联系当地急救服务。\n> 本助手不提供诊断，不能替代医生或康复师，也不用于急救。',
  },
];

function AiMessage({ message, typing }) {
  const isUser = message.role === 'user';
  const shown = useTypewriter(message.content, !isUser && typing);
  if (isUser) {
    return (
      <View style={styles.aiRowUser}>
        <View style={styles.aiBubbleUser}><Text style={styles.aiBubbleUserText}>{message.content}</Text></View>
      </View>
    );
  }
  return (
    <View style={styles.aiRowBot}>
      <LinearGradient colors={message.error ? G.coral : G.primary} start={GS} end={GE} style={styles.aiAvatar}>
        <Ionicons name={message.error ? 'alert' : 'sparkles'} size={15} color={C.white} />
      </LinearGradient>
      <View style={styles.aiBubbleBot}>
        {message.demo && (
          <View style={styles.aiDemoTag}><Ionicons name="flask-outline" size={11} color={C.amberDeep} /><Text style={styles.aiDemoTagText}>本地演示</Text></View>
        )}
        {message.error ? <Text style={styles.aiErrText}>{message.content}</Text> : <MarkdownLite text={shown} />}
      </View>
    </View>
  );
}

function AIDoctorScreen({ aiConfig, setAiConfig, patients, assessments, records, prescriptions }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [typingId, setTypingId] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);
  const configured = aiConfigured(aiConfig);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { const raw = await Storage.getItem(AI_CHAT_KEY); if (raw && alive) setMessages(JSON.parse(raw)); } catch (e) {}
      if (alive) setLoaded(true);
    })();
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (loaded) Storage.setItem(AI_CHAT_KEY, JSON.stringify(messages.slice(-40))).catch(() => {}); }, [messages, loaded]);

  const scrollDown = () => requestAnimationFrame(() => scrollRef.current && scrollRef.current.scrollToEnd({ animated: true }));

  const runAI = async (history, demoFallback) => {
    setSending(true); scrollDown();
    const apiMsgs = [{ role: 'system', content: AI_SYSTEM_PROMPT }]
      .concat(history.slice(-10).map((m) => ({ role: m.role, content: m.prompt || m.content })));
    try {
      let reply; let demo = false;
      if (configured) {
        const controller = new AbortController(); abortRef.current = controller;
        reply = await aiChat(aiConfig, apiMsgs, { signal: controller.signal });
      } else {
        await new Promise((r) => setTimeout(r, 550));
        reply = demoFallback || '我是 **AI 康复助手**。当前是本地规则演示，可整理虚构记录并形成待专业人员复核的训练建议草案。\n\n我不提供诊断，不能替代医生或康复师，也不用于急救。连接第三方模型前，请确认其隐私条款，并勿提交真实敏感医疗数据。';
        demo = true;
      }
      const aMsg = { id: uid('m'), role: 'assistant', content: reply, demo };
      setMessages((prev) => [...prev, aMsg]);
      setTypingId(aMsg.id);
    } catch (e) {
      setMessages((prev) => [...prev, { id: uid('m'), role: 'assistant', content: '请求失败：' + (e.message || '未知错误'), error: true }]);
    } finally { setSending(false); abortRef.current = null; scrollDown(); }
  };

  const sendChat = (text) => {
    const t = (text != null ? text : input).trim();
    if (!t || sending) return;
    if (text == null) setInput('');
    const u = { id: uid('m'), role: 'user', content: t };
    setMessages((prev) => [...prev, u]);
    runAI([...messages, u]);
  };
  const sendQuick = (q) => {
    if (sending) return;
    const u = { id: uid('m'), role: 'user', content: q.label, prompt: q.prompt };
    setMessages((prev) => [...prev, u]);
    runAI([...messages, u], q.demo);
  };
  const analyzePatient = (p) => {
    if (sending) return;
    const run = () => {
      const ctx = buildPatientContext(p, assessments, records, prescriptions);
      const u = { id: uid('m'), role: 'user', content: `整理记录 · ${p.name}`, prompt: `请作为 AI 康复助手整理以下记录，给出记录摘要、待医生或康复师复核的问题、训练建议草案和安全提醒；不要提供诊断或治疗方案：\n\n${ctx}` };
      setMessages((prev) => [...prev, u]);
      runAI([...messages, u], localRecordSummary(p, assessments, records, prescriptions));
    };
    if (!configured) { run(); return; }
    Alert.alert('发送虚构演示记录到第三方模型', '确认仅发送当前虚构演示数据，并已了解所选服务商的数据与费用条款？请勿发送真实敏感健康数据。', [
      { text: '取消', style: 'cancel' },
      { text: '确认发送', onPress: run },
    ]);
  };
  const clearChat = () => {
    if (!messages.length) return;
    Alert.alert('清空对话', '确认清空全部对话记录？', [
      { text: '取消', style: 'cancel' },
      { text: '清空', style: 'destructive', onPress: () => { setMessages([]); setTypingId(null); } },
    ]);
  };

  const empty = messages.length === 0;
  const providerName = (AI_PROVIDERS.find((p) => p.id === aiConfig.provider) || {}).name || '自定义';

  return (
    <KeyboardAvoidingView style={styles.aiScreen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
      <View style={styles.aiHeader}>
        <View style={styles.flex}>
          <NumberedEyebrow num="·" label="AI ASSISTANT" />
          <Text style={styles.aiHeaderTitle}>AI 康复助手</Text>
        </View>
        <TouchableOpacity onPress={clearChat} activeOpacity={0.75} style={styles.aiHeaderBtn}>
          <Ionicons name="refresh-outline" size={18} color={C.inkSoft} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowConfig(true)} activeOpacity={0.75} style={[styles.aiHeaderBtn, { marginLeft: 8 }]}>
          <Ionicons name="settings-outline" size={18} color={C.inkSoft} />
          <View style={[styles.aiStatusDot, { backgroundColor: configured ? C.primary : C.amber }]} />
        </TouchableOpacity>
      </View>

      <View style={[styles.aiStatusBar, { backgroundColor: configured ? C.primaryTint : C.amberTint }]}>
        <Ionicons name={configured ? 'cloud-done-outline' : 'flask-outline'} size={14} color={configured ? C.primaryDeep : C.amberDeep} />
        <Text style={[styles.aiStatusText, { color: configured ? C.primaryDeep : C.amberDeep }]}>
          {configured ? `已连接 ${providerName} · ${aiConfig.model}` : '本地演示模式 · 点击右上角连接你的模型'}
        </Text>
      </View>

      <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.aiScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {empty && (
          <Appear>
            <Card style={styles.aiWelcome}>
              <LinearGradient colors={G.primary} start={GS} end={GE} style={styles.aiWelcomeIcon}>
                <Ionicons name="sparkles" size={26} color={C.white} />
              </LinearGradient>
              <Text style={styles.aiWelcomeTitle}>你好，我是 AI 康复助手</Text>
              <Text style={styles.aiWelcomeSub}>整理演示记录、标记待复核问题并形成训练建议草案；不提供诊断。</Text>
              <View style={styles.aiCapRow}>
                {[{ i: 'analytics-outline', t: '记录解读' }, { i: 'medkit-outline', t: '建议草案' }, { i: 'alert-circle-outline', t: '安全提醒' }].map((c) => (
                  <View key={c.t} style={styles.aiCapCell}>
                    <Ionicons name={c.i} size={18} color={C.primaryDeep} />
                    <Text style={styles.aiCapText}>{c.t}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </Appear>
        )}

        {empty && patients.length > 0 && (
          <Appear delay={80}>
            <Text style={styles.aiSectionLabel}>选择演示档案，整理记录</Text>
            <View style={styles.aiPatientRow}>
              {patients.map((p) => (
                <TouchableOpacity key={p.id} activeOpacity={0.85} onPress={() => analyzePatient(p)} style={styles.aiPatientChip}>
                  <GradientAvatar name={p.name} dim={34} textSize={15} />
                  <View style={{ marginLeft: 9 }}>
                    <Text style={styles.aiPatientName}>{p.name}</Text>
                    <Text style={styles.aiPatientMeta}>{p.diagnosis}</Text>
                  </View>
                  <Ionicons name="arrow-forward-circle" size={20} color={C.primary} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              ))}
            </View>
          </Appear>
        )}

        {empty && (
          <Appear delay={160}>
            <Text style={styles.aiSectionLabel}>试试这些问题</Text>
            <View style={styles.chipRow}>
              {AI_QUICKS.map((q) => (
                <TouchableOpacity key={q.id} activeOpacity={0.8} onPress={() => sendQuick(q)} style={styles.aiQuickChip}>
                  <Ionicons name={q.icon} size={14} color={C.primaryDeep} />
                  <Text style={styles.aiQuickText}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Appear>
        )}

        {messages.map((m) => <AiMessage key={m.id} message={m} typing={m.id === typingId} />)}
        {sending && (
          <View style={styles.aiRowBot}>
            <LinearGradient colors={G.primary} start={GS} end={GE} style={styles.aiAvatar}><Ionicons name="sparkles" size={15} color={C.white} /></LinearGradient>
            <View style={[styles.aiBubbleBot, styles.aiThinking]}><TypingDots /></View>
          </View>
        )}
        {!empty && <Text style={styles.aiDisclaimer}>仅供记录整理，不提供诊断，不能替代医生或康复师，也不用于急救。</Text>}
      </ScrollView>

      <View style={styles.aiComposer}>
        <View style={styles.aiInputBox}>
          <TextInput
            value={input} onChangeText={setInput} placeholder={configured ? '向 AI 康复助手提问…' : '本地演示提问…'}
            placeholderTextColor={C.faint} style={styles.aiInput} multiline
            onSubmitEditing={() => sendChat()} returnKeyType="send"
          />
        </View>
        <TouchableOpacity activeOpacity={0.85} onPress={() => sendChat()} disabled={sending || !input.trim()} style={styles.aiSendWrap}>
          <LinearGradient colors={sending || !input.trim() ? ['#C2C7D2', '#A8AEBC'] : G.primaryDeep} start={GS} end={GE} style={styles.aiSendBtn}>
            <Ionicons name="arrow-up" size={20} color={C.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <AiConfigModal visible={showConfig} config={aiConfig} onClose={() => setShowConfig(false)} onSave={(cfg) => { setAiConfig(cfg); setShowConfig(false); }} />
    </KeyboardAvoidingView>
  );
}

function AiConfigModal({ visible, config, onClose, onSave }) {
  const [draft, setDraft] = useState(config);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  useEffect(() => { if (visible) setDraft(config); }, [visible, config]);
  const pickProvider = (p) => {
    setDraft((prev) => ({
      ...prev, provider: p.id,
      baseUrl: p.id === 'custom' ? prev.baseUrl : p.baseUrl,
      model: p.id === 'custom' ? prev.model : p.model,
    }));
  };
  const test = async () => {
    if (!aiConfigured(draft)) { Alert.alert('提示', '请先填写接口地址、模型和 API Key。'); return; }
    setTesting(true);
    try {
      await aiChat(draft, [{ role: 'user', content: '请只回复两个字：在线' }]);
      Alert.alert('连接成功', '模型已正常响应，可以开始使用了。');
    } catch (e) { Alert.alert('连接失败', e.message || '请检查配置。'); }
    finally { setTesting(false); }
  };
  const active = AI_PROVIDERS.find((p) => p.id === draft.provider) || AI_PROVIDERS[0];
  return (
    <ModalSheet visible={visible} title="连接 AI 模型" subtitle="Key 仅当前运行 · 调用时发往所选服务" onClose={onClose}>
      <View style={styles.aiKeyNote}>
        <Ionicons name="lock-closed" size={13} color={C.primaryDeep} />
        <Text style={styles.aiKeyNoteText}>API Key 不会写入本地持久存储；发起调用时会随请求发送给所选 AI 服务商或你填写的代理。费用与数据处理遵循对应服务条款。</Text>
      </View>
      <Text style={styles.inputLabel}>选择服务商</Text>
      <View style={styles.chipRow}>
        {AI_PROVIDERS.map((p) => <Chip key={p.id} label={p.name} active={draft.provider === p.id} onPress={() => pickProvider(p)} />)}
      </View>
      {!!active.hint && (
        <View style={styles.aiProviderHint}>
          <Ionicons name="information-circle-outline" size={13} color={C.muted} />
          <Text style={styles.aiProviderHintText}>{active.hint}{active.keyUrl ? ` · 申请 Key：${active.keyUrl}` : ''}</Text>
        </View>
      )}
      <InputField label="接口地址 Base URL" icon="link-outline" value={draft.baseUrl} onChangeText={(v) => setDraft((p) => ({ ...p, baseUrl: v }))} placeholder="https://api.deepseek.com/v1" />
      <InputField label="模型名称" icon="cube-outline" value={draft.model} onChangeText={(v) => setDraft((p) => ({ ...p, model: v }))} placeholder="deepseek-chat" />
      <InputField label="API Key" icon="key-outline" value={draft.apiKey} onChangeText={(v) => setDraft((p) => ({ ...p, apiKey: v }))} placeholder="sk-..." secureTextEntry={!showKey}
        right={(
          <TouchableOpacity onPress={() => setShowKey((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={showKey ? 'eye-off-outline' : 'eye-outline'} size={19} color={C.faint} />
          </TouchableOpacity>
        )}
      />
      <InputField label="代理地址（可选，Web 端绕过 CORS 用）" icon="git-network-outline" value={draft.proxyUrl} onChangeText={(v) => setDraft((p) => ({ ...p, proxyUrl: v }))} placeholder="留空则 App 直连，安卓端无需填写" />
      <View style={styles.btnRow}>
        <PrimaryButton label={testing ? '测试中…' : '测试连接'} icon="pulse-outline" tone="ghost" onPress={test} disabled={testing} style={styles.flex} />
        <View style={styles.btnGap} />
        <PrimaryButton label="保存" icon="checkmark" onPress={() => onSave(draft)} style={styles.flex} />
      </View>
    </ModalSheet>
  );
}

function QuickFlowModal({ flow, patients, onClose, addAssessment, addPrescription, addReport }) {
  const [patient, setPatient] = useState(patients[0] ? patients[0].name : '李明');
  const [value, setValue] = useState('75');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (flow) {
      setPatient(patients[0] ? patients[0].name : '李明');
      setValue(flow === 'assessment' ? '75' : flow === 'prescription' ? '15' : '阶段报告');
      setNote('');
    }
  }, [flow, patients]);
  if (!flow) return null;
  const config = flow === 'assessment'
    ? { title: '快捷新建评估', subtitle: '从工作台快速创建一条评估记录', label: '综合评分', placeholder: '0-100', button: '保存评估', icon: 'clipboard-outline' }
    : flow === 'prescription'
      ? { title: '快捷新建建议草案', subtitle: '生成一条待专业人员确认的训练建议草案', label: '单次时长（分钟）', placeholder: '15', button: '保存建议草案', icon: 'medkit-outline' }
      : { title: '快捷生成报告', subtitle: '生成一份可查看的阶段总结', label: '报告标题', placeholder: '阶段康复报告', button: '生成报告', icon: 'document-text-outline' };
  const submit = () => {
    if (flow === 'assessment') {
      const score = clamp(Number(value || 0), 0, 100);
      addAssessment({ id: uid('a'), patient, date: today, grip: Math.round(score / 3), rom: score, pain: score > 75 ? 2 : 4, adl: score, score, note: note || '工作台快捷录入评估。' });
    } else if (flow === 'prescription') {
      addPrescription({ id: uid('rx'), patient, title: '快捷训练建议草案', intensity: '中等', frequency: '每日 2 次', duration: (value || 15) + ' 分钟', status: '待专业人员确认', focus: note || '抓握稳定性、精细动作' });
    } else {
      addReport({ id: uid('rp'), patient, title: value || '阶段康复报告', date: today, status: '已生成', summary: note || '系统已生成阶段总结，建议结合评估记录和医生意见复核。' });
    }
    onClose();
    Alert.alert('完成', '内容已保存，并同步到对应模块。');
  };
  return (
    <ModalSheet visible={!!flow} title={config.title} subtitle={config.subtitle} onClose={onClose}>
      <Text style={styles.inputLabel}>患者</Text>
      <View style={styles.chipRow}>{patients.map((item) => <Chip key={item.id} label={item.name} active={patient === item.name} onPress={() => setPatient(item.name)} />)}</View>
      <InputField label={config.label} icon={config.icon} value={value} onChangeText={setValue} placeholder={config.placeholder} keyboardType={flow === 'report' ? 'default' : 'numeric'} />
      <InputField label="备注" icon="create-outline" value={note} onChangeText={setNote} placeholder="可选" />
      <PrimaryButton label={config.button} icon="checkmark-circle-outline" onPress={submit} />
    </ModalSheet>
  );
}

function TabBar({ value, onChange }) {
  return (
    <View style={styles.tabBarWrap}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const active = value === tab.key;
          if (tab.center) {
            return (
              <TouchableOpacity key={tab.key} style={styles.tabCenterItem} activeOpacity={0.85} onPress={() => onChange(tab.key)}>
                <LinearGradient colors={active ? G.primary : G.primaryDeep} start={GS} end={GE} style={styles.tabCenterBtn}>
                  <Ionicons name={active ? tab.activeIcon : tab.icon} size={25} color={C.white} />
                </LinearGradient>
                <Text style={[styles.tabCenterLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity key={tab.key} style={styles.tabItem} activeOpacity={0.7} onPress={() => onChange(tab.key)}>
              {active ? (
                <LinearGradient colors={G.primaryDeep} start={GS} end={GE} style={styles.tabIconActive}>
                  <Ionicons name={tab.activeIcon} size={20} color={C.white} />
                </LinearGradient>
              ) : (
                <View style={styles.tabIcon}><Ionicons name={tab.icon} size={20} color={C.muted} /></View>
              )}
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* ============================ App 根 ============================ */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [activeTab, setActiveTab] = useState('workbench');
  const [patients, setPatients] = useState(initialPatients);
  const [devices, setDevices] = useState(initialDevices);
  const [assessments, setAssessments] = useState(initialAssessments);
  const [prescriptions, setPrescriptions] = useState(initialPrescriptions);
  const [records, setRecords] = useState(initialRecords);
  const [reports, setReports] = useState(initialReports);
  const [storage, setStorage] = useState(initialStorage);
  const [tasks, setTasks] = useState(initialTasks);
  const [engagement, setEngagement] = useState(initialEngagement);
  const [aiConfig, setAiConfigState] = useState(DEFAULT_AI_CONFIG);
  const [flow, setFlow] = useState(null);
  const persistTimer = useRef(null);

  const applyAppData = (appData = {}) => {
    const fallback = defaultAppData();
    setPatients(Array.isArray(appData.patients) ? appData.patients : fallback.patients);
    setDevices(Array.isArray(appData.devices) ? appData.devices : fallback.devices);
    setAssessments(Array.isArray(appData.assessments) ? appData.assessments : fallback.assessments);
    setPrescriptions(Array.isArray(appData.prescriptions) ? appData.prescriptions : fallback.prescriptions);
    setRecords(Array.isArray(appData.records) ? appData.records : fallback.records);
    setReports(Array.isArray(appData.reports) ? appData.reports : fallback.reports);
    setStorage(Array.isArray(appData.storage) ? appData.storage : fallback.storage);
    setTasks(Array.isArray(appData.tasks) ? appData.tasks : fallback.tasks);
    setEngagement(appData.engagement && typeof appData.engagement === 'object' ? { ...initialEngagement, ...appData.engagement } : fallback.engagement);
  };
  const updateAiConfig = (cfg) => { setAiConfigState(cfg); persistAiConfig(cfg); };
  const resetLocalData = () => { applyAppData(defaultAppData()); setActiveTab('workbench'); setFlow(null); };
  const readWorkspaceSession = async () => {
    const savedUser = await Storage.getItem(WORKSPACE_USER_KEY);
    const savedData = await Storage.getItem(WORKSPACE_DATA_KEY);
    return {
      token: WORKSPACE_TOKEN,
      user: savedUser ? JSON.parse(savedUser) : DEFAULT_WORKSPACE_USER,
      appData: savedData ? JSON.parse(savedData) : defaultAppData(),
    };
  };

  useEffect(() => {
    let alive = true;
    const bootstrap = async () => {
      try {
        loadAiConfig().then((cfg) => { if (alive) setAiConfigState(cfg); });
        const savedToken = await Storage.getItem(AUTH_TOKEN_KEY);
        if (savedToken) {
          if (savedToken === WORKSPACE_TOKEN) {
            const workspace = await readWorkspaceSession();
            if (!alive) return;
            applyAppData(workspace.appData);
            setToken(workspace.token); setUser(workspace.user); setCloudReady(false);
            return;
          }
          const [me, data] = await Promise.all([
            apiRequest('/api/me', { token: savedToken }),
            apiRequest('/api/app-data', { token: savedToken }),
          ]);
          if (!alive) return;
          applyAppData(data.appData);
          setToken(savedToken); setUser(me.user); setCloudReady(true);
        }
      } catch (error) {
        await Storage.removeItem(AUTH_TOKEN_KEY);
        if (alive) { setToken(null); setUser(null); setCloudReady(false); }
      } finally { if (alive) setLoading(false); }
    };
    bootstrap();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!token || !user) return undefined;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      const appData = { patients, devices, assessments, prescriptions, records, reports, storage, tasks, engagement };
      if (token === WORKSPACE_TOKEN) {
        Storage.setItem(WORKSPACE_DATA_KEY, JSON.stringify(appData)).catch((error) => console.warn('Local save failed', error.message));
        return;
      }
      if (!cloudReady) return;
      apiRequest('/api/app-data', { method: 'PUT', token, body: { appData } }).catch((error) => console.warn('Sync failed', error.message));
    }, 900);
    return () => { if (persistTimer.current) clearTimeout(persistTimer.current); };
  }, [token, user, cloudReady, patients, devices, assessments, prescriptions, records, reports, storage, tasks, engagement]);

  const handleAuthenticated = (data, options = {}) => {
    applyAppData(data.appData); setToken(data.token); setUser(data.user); setCloudReady(!options.local);
  };
  const handleWorkspaceLogin = async (userOverride) => {
    const workspace = await readWorkspaceSession();
    const nextSession = userOverride ? { ...workspace, user: { ...workspace.user, ...userOverride } } : workspace;
    await Storage.setItem(AUTH_TOKEN_KEY, WORKSPACE_TOKEN);
    await Storage.setItem(WORKSPACE_USER_KEY, JSON.stringify(nextSession.user));
    await Storage.setItem(WORKSPACE_DATA_KEY, JSON.stringify(nextSession.appData));
    handleAuthenticated(nextSession, { local: true });
  };
  const handleLogout = async () => {
    await Storage.removeItem(AUTH_TOKEN_KEY);
    setToken(null); setUser(null); setCloudReady(false); resetLocalData();
  };
  const handleDeleteAccount = async () => {
    if (!token) return;
    try {
      if (token === WORKSPACE_TOKEN) {
        await Storage.multiRemove([AUTH_TOKEN_KEY, WORKSPACE_USER_KEY, WORKSPACE_DATA_KEY]);
        setToken(null); setUser(null); setCloudReady(false); resetLocalData();
        Alert.alert('账号与数据已删除', '当前工作区保存的数据已清除。');
        return;
      }
      await apiRequest('/api/account', { method: 'DELETE', token });
      await Storage.removeItem(AUTH_TOKEN_KEY);
      setToken(null); setUser(null); setCloudReady(false); resetLocalData();
      Alert.alert('账号已注销', '账号和关联数据已删除。');
    } catch (error) { Alert.alert('注销失败', error.message || '请稍后重试。'); }
  };
  const handleUpdateUser = async (nextUser) => {
    if (!token) return;
    if (token === WORKSPACE_TOKEN) {
      const updated = { ...user, name: nextUser.name, role: nextUser.role };
      await Storage.setItem(WORKSPACE_USER_KEY, JSON.stringify(updated));
      setUser(updated);
      return;
    }
    const data = await apiRequest('/api/me', { method: 'PATCH', token, body: { name: nextUser.name, role: nextUser.role } });
    setUser(data.user);
  };
  const addAssessment = (item) => setAssessments((prev) => [item, ...prev]);
  const addPrescription = (item) => setPrescriptions((prev) => [item, ...prev]);
  const addReport = (item) => setReports((prev) => [item, ...prev]);

  if (loading) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <LinearGradient colors={G.splash} start={GS} end={GE} style={StyleSheet.absoluteFill} />
        <Svg width="100%" height="100%" viewBox="0 0 400 800" style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgRG id="splashBlob1" cx="0.85" cy="0.15" r="0.5">
              <Stop offset="0" stopColor="#1FD09B" stopOpacity="0.30" />
              <Stop offset="1" stopColor="#1FD09B" stopOpacity="0" />
            </SvgRG>
            <SvgRG id="splashBlob2" cx="0.15" cy="0.85" r="0.5">
              <Stop offset="0" stopColor="#E0594E" stopOpacity="0.25" />
              <Stop offset="1" stopColor="#E0594E" stopOpacity="0" />
            </SvgRG>
          </Defs>
          <Rect width="400" height="800" fill="url(#splashBlob1)" />
          <Rect width="400" height="800" fill="url(#splashBlob2)" />
        </Svg>
        <View style={styles.splashLogo}>
          <HeroMedallion size={140} pct={0.86} />
        </View>
        <Text style={styles.splashTitle}>健康守护者</Text>
        <Text style={styles.splashSubtitle}>智能手部康复 · 守护每一次进步</Text>
      </View>
    );
  }
  if (!user) return <LoginScreen onLogin={handleAuthenticated} onWorkspaceLogin={handleWorkspaceLogin} />;

  const renderScreen = () => {
    if (activeTab === 'device') return <DeviceScreen devices={devices} setDevices={setDevices} onBack={() => setActiveTab('workbench')} />;
    if (activeTab === 'ai') return <AIDoctorScreen aiConfig={aiConfig} setAiConfig={updateAiConfig} patients={patients} assessments={assessments} records={records} prescriptions={prescriptions} />;
    if (activeTab === 'training') return <TrainingScreen patients={patients} setPatients={setPatients} assessments={assessments} setAssessments={setAssessments} prescriptions={prescriptions} setPrescriptions={setPrescriptions} records={records} setRecords={setRecords} />;
    if (activeTab === 'data') return <DataScreen records={records} setRecords={setRecords} reports={reports} setReports={setReports} storage={storage} />;
    if (activeTab === 'profile') return <ProfileScreen user={user} setUser={setUser} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} onUpdateUser={handleUpdateUser} aiConfig={aiConfig} setAiConfig={updateAiConfig} />;
    return <WorkbenchScreen user={user} patients={patients} devices={devices} assessments={assessments} records={records} reports={reports} tasks={tasks} setTasks={setTasks} engagement={engagement} setEngagement={setEngagement} aiConfig={aiConfig} openFlow={setFlow} goTab={setActiveTab} />;
  };

  return (
    <SafeAreaView style={styles.appRoot}>
      <StatusBar style="dark" />
      <View style={styles.productBoundaryBanner}>
        <View style={styles.productBoundaryTop}>
          <Ionicons name="flask-outline" size={14} color={C.amberDeep} />
          <Text style={styles.productBoundaryTitle}>个人作品演示</Text>
        </View>
        <Text style={styles.productBoundaryText}>以下患者、训练与设备数据均为虚构演示数据 · 不提供诊断 · 不能替代医生或康复师 · 不用于急救</Text>
        <Text style={styles.productBoundaryText}>零成本模式：{COST_STATUS.mode} · AI 默认关闭/本地演示 · 无自动超额扣费 · BYOK / BYOI</Text>
      </View>
      <View style={styles.appBody}>{renderScreen()}</View>
      <TabBar value={activeTab} onChange={setActiveTab} />
      <QuickFlowModal flow={flow} patients={patients} onClose={() => setFlow(null)} addAssessment={addAssessment} addPrescription={addPrescription} addReport={addReport} />
    </SafeAreaView>
  );
}

const cardW = (APP_WIDTH - 48) / 2;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  appRoot: {
    flex: 1,
    backgroundColor: C.bg,
    ...(Platform.OS === 'web' ? {
      width: '100%',
      maxWidth: 430,
      marginLeft: 'auto',
      marginRight: 'auto',
    } : {}),
  },
  appBody: { flex: 1, backgroundColor: C.bg },
  productBoundaryBanner: { backgroundColor: '#FFF7E5', borderBottomWidth: 1, borderBottomColor: '#E9D7AE', paddingHorizontal: 16, paddingVertical: 8 },
  productBoundaryTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  productBoundaryTitle: { color: C.amberDeep, fontSize: 11.5, fontWeight: '900', marginLeft: 5, letterSpacing: 0.4 },
  productBoundaryText: { color: C.inkSoft, fontSize: 10.5, lineHeight: 15, fontWeight: '600' },
  screen: { flex: 1, backgroundColor: C.bg },
  screenContent: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 120 },

  /* splash */
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splashLogo: { marginBottom: 22 },
  splashTitle: { fontSize: 28, color: C.white, fontWeight: '800', letterSpacing: 3 },
  splashSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.86)', marginTop: 10, letterSpacing: 0.8 },

  /* card */
  card: { backgroundColor: C.surface, borderRadius: 22, borderWidth: 1, borderColor: C.border, padding: 18, marginBottom: 14, ...SHADOW.card },
  listCard: { padding: 4, paddingHorizontal: 18 },
  menuCard: { paddingVertical: 4, paddingHorizontal: 16 },

  /* numbered eyebrow */
  numEyeWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  numEyeNum: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginRight: 8, opacity: 0.85 },
  numEyeLine: { width: 22, height: 1.5, borderRadius: 1, marginRight: 8, opacity: 0.5 },
  numEyeLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 2.5, textTransform: 'uppercase' },

  /* iconTile */
  iconTile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

  /* avatar */
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.white, fontWeight: '800' },

  /* login */
  loginPage: { flex: 1, backgroundColor: C.bg },
  loginScroll: { paddingHorizontal: 22, paddingTop: 40, paddingBottom: 50 },
  loginBrandWrap: { alignItems: 'center', marginBottom: 22 },
  loginMedallion: { marginBottom: 18 },
  loginTitle: { fontSize: 28, fontWeight: '800', color: C.ink, letterSpacing: 1, marginTop: 4 },
  loginSubtitle: { fontSize: 13, color: C.muted, marginTop: 8, letterSpacing: 0.3 },
  loginDisclosure: { width: '100%', backgroundColor: '#FFF7E5', borderWidth: 1, borderColor: '#E9D7AE', borderRadius: 14, padding: 12, marginTop: 16 },
  loginDisclosureTitle: { color: C.amberDeep, fontSize: 12, fontWeight: '900', marginBottom: 4 },
  loginDisclosureText: { color: C.inkSoft, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  loginCard: { padding: 20, marginBottom: 0 },
  loginToggle: { flexDirection: 'row', padding: 4, backgroundColor: C.surfaceMuted, borderRadius: 13, marginBottom: 18 },
  loginToggleItem: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  loginToggleActive: { backgroundColor: C.surface, ...SHADOW.card },
  loginToggleText: { color: C.muted, fontSize: 14.5, fontWeight: '700' },
  loginToggleTextActive: { color: C.ink },
  loginSubmit: { marginTop: 6 },
  loginDemo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: C.amberTint, borderRadius: 10 },
  loginDemoText: { marginLeft: 6, color: C.amberDeep, fontSize: 12, fontWeight: '700' },

  /* workbench */
  wbTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginTop: 4 },
  wbGreetSmall: { fontSize: 12.5, color: C.muted, fontWeight: '600' },
  wbGreetBig: { fontSize: 22, color: C.ink, fontWeight: '800', marginTop: 4 },
  wbBell: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  wbBellDot: { position: 'absolute', top: 11, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: C.coral, borderWidth: 2, borderColor: C.surface },

  /* hero card */
  wbHero: { borderRadius: 26, backgroundColor: C.surfaceWarm, borderWidth: 1, borderColor: C.border, marginBottom: 22, overflow: 'hidden' },
  wbHeroInner: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4 },
  wbHeroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  wbHeroDate: { fontSize: 11.5, color: C.muted, fontWeight: '700', letterSpacing: 0.5 },
  wbHeroMain: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  wbMedallion: { marginRight: 8 },
  wbHeroRight: { flex: 1, paddingLeft: 8 },
  wbBigNumWrap: { flexDirection: 'row', alignItems: 'flex-end' },
  wbBigNum: { fontSize: 68, color: C.ink, fontWeight: '800', letterSpacing: -1.5, lineHeight: 72 },
  wbBigNumUnit: { fontSize: 24, color: C.muted, fontWeight: '700', marginBottom: 10, marginLeft: 3 },
  wbBigNumLabel: { fontSize: 13, color: C.muted, fontWeight: '700', marginTop: -2 },
  wbTrendChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primaryTint, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, marginTop: 8 },
  wbTrendText: { color: C.primaryDeep, fontSize: 11.5, fontWeight: '800', marginLeft: 4 },

  wbHeroSparkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 8, paddingHorizontal: 4 },
  wbHeroSparkInfo: { marginLeft: 12, alignItems: 'flex-end' },
  wbHeroSparkBig: { fontSize: 22, color: C.ink, fontWeight: '900', letterSpacing: -0.5 },
  wbHeroSparkSm: { fontSize: 10.5, color: C.muted, fontWeight: '700', letterSpacing: 0.5, marginTop: 1 },

  wbHeroStats: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingBottom: 4, borderTopWidth: 1, borderTopColor: C.divider, marginTop: 6 },
  wbHeroStat: { flex: 1, alignItems: 'center' },
  wbHeroStatNum: { fontSize: 22, color: C.ink, fontWeight: '900' },
  wbHeroStatLbl: { fontSize: 11, color: C.muted, fontWeight: '700', marginTop: 3, letterSpacing: 0.3 },
  wbHeroStatDiv: { width: 1, height: 30, backgroundColor: C.divider },

  /* section header */
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: C.ink, letterSpacing: 0.2 },
  sectionSubtitle: { fontSize: 12, color: C.muted, marginTop: 4 },
  textAction: { flexDirection: 'row', alignItems: 'center' },
  textActionLabel: { color: C.primaryDeep, fontSize: 13, fontWeight: '800', marginRight: 5 },

  /* tasks */
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.divider },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  checkboxDone: { backgroundColor: C.primaryDeep, borderColor: C.primaryDeep },
  taskTitle: { fontSize: 14.5, fontWeight: '700', color: C.ink },
  taskTitleDone: { textDecorationLine: 'line-through', color: C.faint },
  taskMeta: { fontSize: 12, color: C.muted, marginTop: 3 },

  /* quick grid */
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  quickCard: { width: cardW, backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 12, position: 'relative', overflow: 'hidden', minHeight: 140, ...SHADOW.card },
  quickCardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  quickNum: { fontSize: 26, color: C.border, fontWeight: '900', letterSpacing: 0.5 },
  quickTitle: { fontSize: 16, fontWeight: '800', color: C.ink, marginTop: 12 },
  quickCaption: { fontSize: 12, color: C.muted, marginTop: 3 },
  quickArrow: { position: 'absolute', bottom: 14, right: 16, width: 28, height: 28, borderRadius: 14, backgroundColor: C.primaryTint, alignItems: 'center', justifyContent: 'center' },

  /* badge */
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  badgeDot: { width: 5, height: 5, borderRadius: 3, marginRight: 5 },
  badgeText: { fontSize: 11.5, fontWeight: '800' },

  /* featured patient */
  featuredCard: { padding: 18 },
  featuredHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  featuredName: { fontSize: 18, fontWeight: '900', color: C.ink },
  featuredMeta: { fontSize: 12.5, color: C.muted, marginTop: 4 },
  featuredSparkWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.divider },
  featuredSparkLabel: { fontSize: 11, color: C.muted, fontWeight: '700', letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' },
  featuredScoreBox: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, alignItems: 'center', marginLeft: 12 },
  featuredScore: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  featuredScoreLbl: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 2, opacity: 0.8 },
  featuredStats: { flexDirection: 'row', alignItems: 'center' },
  featuredStatItem: { flex: 1 },
  featuredStatValue: { color: C.ink, fontSize: 14.5, fontWeight: '800' },
  featuredStatLabel: { color: C.muted, fontSize: 11, fontWeight: '700', marginTop: 3, letterSpacing: 0.5 },
  featuredStatDiv: { width: 1, height: 28, backgroundColor: C.divider, marginHorizontal: 10 },

  /* patient row */
  patientRow: { flexDirection: 'row', alignItems: 'center' },
  patientName: { fontSize: 15.5, fontWeight: '800', color: C.ink },
  patientMeta: { fontSize: 12, color: C.muted, marginTop: 4 },
  patientNextRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  patientNext: { fontSize: 12, color: C.muted, fontWeight: '600', marginLeft: 4 },

  /* page header */
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, marginTop: 4 },
  pageTitle: { fontSize: 28, fontWeight: '900', color: C.ink, letterSpacing: 0.3, marginTop: 2 },
  pageSubtitle: { fontSize: 13, color: C.muted, marginTop: 6 },
  addButtonWrap: SHADOW.glowPrimary,
  addButton: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  /* big metric card */
  bigMetricRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  bigMetric: { backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 16, marginRight: 12, marginBottom: 12, ...SHADOW.card },
  bigMetricHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bigMetricBadge: { width: 24, height: 24, borderRadius: 6, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  bigMetricNumRow: { flexDirection: 'row', alignItems: 'flex-end' },
  bigMetricNum: { fontSize: 36, fontWeight: '900', letterSpacing: -1, lineHeight: 38 },
  bigMetricUnit: { fontSize: 14, fontWeight: '700', marginBottom: 5, marginLeft: 3 },
  bigMetricLabel: { fontSize: 12, color: C.muted, fontWeight: '700', marginTop: 4, letterSpacing: 0.3 },

  /* device */
  deviceCard: { padding: 16 },
  deviceTop: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.ink },
  cardMeta: { fontSize: 12, color: C.muted, marginTop: 4 },
  deviceStatusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: C.surfaceMuted },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusPillText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1 },
  deviceMetrics: { flexDirection: 'row', marginTop: 16 },
  deviceMetric: { flex: 1, marginRight: 16 },
  deviceMetricHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  deviceMetricLabel: { fontSize: 12, color: C.muted, fontWeight: '600' },
  deviceMetricValue: { fontSize: 14, fontWeight: '800' },
  progressTrack: { width: '100%', borderRadius: 999, backgroundColor: C.surfaceMuted, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  syncText: { fontSize: 12, color: C.faint, marginTop: 14, marginBottom: 10 },
  deviceActions: { flexDirection: 'row' },
  deviceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 11, backgroundColor: C.surfaceMuted, marginHorizontal: 4, overflow: 'hidden' },
  deviceBtnPrimary: { backgroundColor: C.primary },
  deviceBtnText: { color: C.inkSoft, fontSize: 12.5, fontWeight: '700', marginLeft: 5 },
  deviceBtnTextPrimary: { color: C.white },

  /* empty */
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyTitle: { color: C.ink, fontSize: 16, fontWeight: '800', marginTop: 14 },
  emptyCaption: { color: C.muted, fontSize: 12.5, lineHeight: 20, textAlign: 'center', marginTop: 7 },
  emptyAction: { marginTop: 16, alignSelf: 'stretch' },

  /* segmented */
  segmentWrap: { paddingRight: 8, paddingVertical: 4, marginBottom: 16 },
  segmentTouch: { marginRight: 8, borderRadius: 14, overflow: 'hidden' },
  segmentItem: { flexDirection: 'row', alignItems: 'center', height: 42, paddingHorizontal: 16, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  segmentActive: { flexDirection: 'row', alignItems: 'center', height: 42, paddingHorizontal: 16, ...SHADOW.glowPrimary },
  segmentText: { marginLeft: 6, fontSize: 13, color: C.muted, fontWeight: '700' },
  segmentActiveText: { marginLeft: 6, fontSize: 13, color: C.white, fontWeight: '800' },

  /* input */
  inputGroup: { marginBottom: 14 },
  inputLabel: { color: C.ink, fontSize: 13, fontWeight: '800', marginBottom: 8, marginTop: 2, letterSpacing: 0.3 },
  inputBox: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceWarm, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: C.ink, fontSize: 15, paddingVertical: 12 },

  /* chip */
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, marginRight: 8, marginBottom: 9 },
  chipText: { fontSize: 13, color: C.muted, fontWeight: '700' },

  /* buttons */
  btnWrap: { borderRadius: 14, marginHorizontal: 4 },
  btn: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 18, position: 'relative' },
  btnText: { color: C.white, fontSize: 15, fontWeight: '800', letterSpacing: 0.4 },
  btnTrail: { position: 'absolute', right: 16 },
  btnGhost: { minHeight: 52, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 18, marginHorizontal: 4 },
  btnGhostText: { color: C.inkSoft, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  btnIcon: { marginRight: 7 },
  btnRow: { flexDirection: 'row' },
  btnGap: { width: 8 },
  topGap: { marginTop: 10 },

  /* item card */
  itemCard: { padding: 16 },
  itemTopLine: { flexDirection: 'row', alignItems: 'center' },
  itemTopText: { marginLeft: 12 },

  /* score medallion */
  scoreMedallionWrap: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  scoreMedallionTextWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  scoreMedallionNum: { fontSize: 18, fontWeight: '900' },

  /* mini strip */
  miniStrip: { flexDirection: 'row', backgroundColor: C.surfaceMuted, borderRadius: 14, paddingVertical: 12, marginTop: 14, marginBottom: 14 },
  miniStat: { flex: 1, alignItems: 'center' },
  miniDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 5 },
  miniStatValue: { color: C.ink, fontSize: 14.5, fontWeight: '800' },
  miniStatLabel: { color: C.muted, fontSize: 11, marginTop: 4 },

  /* note */
  noteWrap: { flexDirection: 'row', backgroundColor: C.surfaceMuted, borderRadius: 12, padding: 12 },
  noteText: { color: C.inkSoft, fontSize: 12.5, lineHeight: 20, marginLeft: 8, flex: 1 },

  /* profile card */
  profileCard: { padding: 16, overflow: 'hidden', position: 'relative' },
  profileStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  profileTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginTop: 4 },
  profileName: { fontSize: 17, fontWeight: '800', color: C.ink },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 4 },
  infoCell: { width: '48.5%', backgroundColor: C.surfaceMuted, borderRadius: 12, padding: 12, marginBottom: 10 },
  infoLabel: { color: C.muted, fontSize: 11.5, marginBottom: 5, fontWeight: '700', letterSpacing: 0.3 },
  infoValue: { color: C.ink, fontSize: 13.5, fontWeight: '700' },

  /* record */
  recordScoreBox: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  recordScoreNumber: { fontSize: 20, fontWeight: '900' },
  recordScoreUnit: { fontSize: 10, fontWeight: '700', marginTop: -2, letterSpacing: 0.5 },
  recordBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 14 },
  recordMeta: { color: C.muted, fontSize: 12, fontWeight: '600', marginRight: 10 },
  recordPct: { fontSize: 12.5, fontWeight: '800', marginLeft: 10 },
  exportPreview: { backgroundColor: '#F4F7F5', borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 13, marginBottom: 14 },
  exportPreviewLabel: { color: C.primaryDeep, fontSize: 10.5, fontWeight: '900', letterSpacing: 0.8, marginBottom: 8 },
  exportPreviewText: { color: C.inkSoft, fontSize: 12, lineHeight: 18 },

  /* game */
  gameCard: { padding: 18 },
  gameTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  gameTopLeft: { width: 64, height: 64, position: 'relative' },
  gameTopOver: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  gameTopTime: { color: C.ink, fontSize: 18, fontWeight: '900' },
  gamePatient: { fontSize: 17, fontWeight: '800', color: C.ink },
  gameRowChip: { alignSelf: 'flex-start', marginTop: 6, backgroundColor: C.amberTint, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  gameRowChipText: { color: C.amberDeep, fontSize: 11, fontWeight: '800' },
  gameScoreColumn: { alignItems: 'flex-end' },
  gameScoreNum: { color: C.ink, fontSize: 32, fontWeight: '900', letterSpacing: -1, lineHeight: 32 },
  gameScoreLabel: { color: C.muted, fontSize: 11, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
  gripPadWrap: { borderRadius: 22, overflow: 'hidden', marginTop: 4, marginBottom: 14, ...SHADOW.hero },
  gripPad: { paddingVertical: 30, paddingHorizontal: 20, alignItems: 'center', position: 'relative', overflow: 'hidden' },
  gripIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.20)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)' },
  gripTitle: { color: C.white, fontSize: 17, fontWeight: '800', marginTop: 16, letterSpacing: 0.5 },
  gripSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, marginTop: 6, marginBottom: 16 },
  gripBar: { width: '100%', height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  gripBarFill: { height: '100%', borderRadius: 999, backgroundColor: C.white },

  /* analytics hero */
  analyticsHero: { padding: 18, marginBottom: 14 },
  analyticsHeroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  analyticsHugeNum: { fontSize: 58, color: C.ink, fontWeight: '800', letterSpacing: -1, lineHeight: 62 },
  analyticsHugeUnit: { fontSize: 18, color: C.muted, fontWeight: '700', marginBottom: 10, marginLeft: 3 },
  analyticsHugeLabel: { fontSize: 13, color: C.muted, fontWeight: '700', marginTop: 2 },
  analyticsTrend: { alignItems: 'flex-end' },
  analyticsTrendChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primaryTint, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, marginTop: 4 },
  analyticsTrendText: { color: C.primaryDeep, fontSize: 11.5, fontWeight: '800', marginLeft: 3 },
  chartEmpty: { color: C.muted, fontSize: 13, marginTop: 12, textAlign: 'center' },
  barChart: { height: 140, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12 },
  barItem: { alignItems: 'center', flex: 1 },
  barValue: { color: C.inkSoft, fontSize: 11, fontWeight: '800', marginBottom: 6 },
  barLabel: { marginTop: 8, color: C.muted, fontSize: 11.5, fontWeight: '700' },

  /* storage */
  storageCard: { flexDirection: 'row', alignItems: 'center' },
  storageSize: { color: C.muted, fontSize: 12, fontWeight: '700' },

  /* profile hero */
  profileHeroWrap: { borderRadius: 26, overflow: 'hidden', marginBottom: 18, marginTop: 4, position: 'relative', height: 134 },
  profileHeroBody: { flexDirection: 'row', alignItems: 'center', padding: 20, flex: 1, zIndex: 2 },
  profileAvatarRing: { padding: 3, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)' },
  profileHeroName: { color: C.white, fontSize: 22, fontWeight: '900', letterSpacing: 0.3 },
  profileHeroTagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7 },
  profileHeroTag: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 3, marginRight: 8 },
  profileHeroTagText: { color: C.white, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.3 },
  profileHeroEmail: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },
  profileEditBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },

  profileMenu: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  profileMenuTitle: { color: C.ink, fontSize: 14.5, fontWeight: '700' },
  profileMenuCaption: { color: C.muted, fontSize: 12, marginTop: 3 },
  versionText: { textAlign: 'center', color: C.faint, fontSize: 12, marginTop: 8, marginBottom: 4, letterSpacing: 0.5 },
  aboutMark: { alignItems: 'center', marginBottom: 16, marginTop: 4 },
  aboutName: { fontSize: 16, fontWeight: '800', color: C.ink, marginTop: 12, letterSpacing: 0.5 },
  detailParagraph: { color: C.inkSoft, fontSize: 13.5, lineHeight: 23, marginBottom: 14 },

  /* modal */
  modalShade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(26,28,32,0.45)' },
  modalSheet: { maxHeight: '88%', backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 10 },
  modalHandle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: C.border, marginTop: 10, marginBottom: 14 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: C.ink, fontSize: 19, fontWeight: '900' },
  modalSubtitle: { color: C.muted, fontSize: 12, marginTop: 4 },
  modalClose: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surfaceMuted },
  modalBody: { paddingBottom: 26 },
  modalReportTitle: { color: C.ink, fontSize: 17, fontWeight: '800', marginBottom: 14 },

  /* tab bar */
  tabBarWrap: { position: 'absolute', left: 16, right: 16, bottom: Platform.OS === 'ios' ? 26 : 16 },
  tabBar: { height: 66, borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, ...SHADOW.raised },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { width: 38, height: 30, alignItems: 'center', justifyContent: 'center' },
  tabIconActive: { width: 40, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center', ...SHADOW.glowPrimary },
  tabLabel: { color: C.muted, fontSize: 10.5, fontWeight: '700', marginTop: 4 },
  tabLabelActive: { color: C.primaryDeep },
  tabCenterItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabCenterBtn: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginTop: -30, borderWidth: 4, borderColor: C.surface, ...SHADOW.glowPrimary },
  tabCenterLabel: { color: C.primaryDeep, fontSize: 10.5, fontWeight: '800', marginTop: 5 },

  /* back row */
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, marginTop: 2 },
  backText: { color: C.primaryDeep, fontSize: 13.5, fontWeight: '800', marginLeft: 2 },

  /* markdown lite */
  mdBold: { fontWeight: '800', color: C.ink },
  mdH: { fontSize: 14.5, fontWeight: '900', color: C.ink, marginTop: 10, marginBottom: 4, letterSpacing: 0.2 },
  mdP: { fontSize: 13.5, lineHeight: 21, color: C.inkSoft, flexShrink: 1 },
  mdRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4, paddingRight: 4 },
  mdDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, marginTop: 7, marginRight: 9 },
  mdNum: { fontSize: 13, fontWeight: '900', color: C.primaryDeep, marginRight: 8, marginTop: 0.5, minWidth: 14 },
  mdQuote: { flexDirection: 'row', backgroundColor: C.amberTint, borderRadius: 10, padding: 10, marginTop: 10, borderLeftWidth: 3, borderLeftColor: C.amber },
  mdQuoteText: { fontSize: 12, lineHeight: 18, color: C.amberDeep, flex: 1, fontWeight: '600' },

  /* achievements */
  achCard: { padding: 16 },
  achRow: { flexDirection: 'row', justifyContent: 'space-between' },
  achItem: { alignItems: 'center', flex: 1 },
  achMedal: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  achMedalLock: { backgroundColor: C.surfaceMuted, borderWidth: 1, borderColor: C.border },
  achLabel: { fontSize: 10.5, color: C.inkSoft, fontWeight: '700', marginTop: 8, textAlign: 'center' },

  /* workbench: AI banner */
  aiBanner: { borderRadius: 22, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 16 },
  aiBannerIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', marginRight: 14 },
  aiBannerTagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  aiBannerTag: { backgroundColor: '#1FD09B', color: '#063D34', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, marginRight: 8, overflow: 'hidden' },
  aiBannerEyebrow: { color: 'rgba(255,255,255,0.82)', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  aiBannerTitle: { color: C.white, fontSize: 15.5, fontWeight: '900', letterSpacing: 0.2 },
  aiBannerSub: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '600', marginTop: 4 },

  /* workbench: streak */
  streakCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  streakFlame: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  streakNumRow: { flexDirection: 'row', alignItems: 'flex-end' },
  streakNum: { fontSize: 30, fontWeight: '900', color: C.ink, letterSpacing: -1, lineHeight: 32 },
  streakUnit: { fontSize: 14, color: C.muted, fontWeight: '800', marginLeft: 4, marginBottom: 3 },
  streakLabel: { fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 4 },
  streakBtnWrap: SHADOW.glowPrimary,
  streakBtn: { flexDirection: 'row', alignItems: 'center', height: 40, paddingHorizontal: 16, borderRadius: 13 },
  streakBtnText: { color: C.white, fontSize: 13.5, fontWeight: '800', marginLeft: 6 },

  /* workbench: plan */
  planCard: { padding: 16 },
  planHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 14, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: C.divider },
  planRingWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  planRingText: { position: 'absolute', fontSize: 11, fontWeight: '900', color: C.primaryDeep },
  planHeadText: { flex: 1, fontSize: 13, color: C.inkSoft, fontWeight: '700', lineHeight: 19 },
  planRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  planCheck: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  planCheckDone: { backgroundColor: C.primaryDeep, borderColor: C.primaryDeep },
  planTitle: { fontSize: 14, fontWeight: '700', color: C.ink },
  planMeta: { fontSize: 11.5, color: C.muted, marginTop: 3 },

  /* workbench: knowledge */
  knowScroll: { paddingRight: 8, paddingBottom: 4 },
  knowCard: { width: 220, backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 15, marginRight: 12, ...SHADOW.card },
  knowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  knowTag: { backgroundColor: C.surfaceMuted, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  knowTagText: { fontSize: 10.5, color: C.inkSoft, fontWeight: '800', letterSpacing: 0.5 },
  knowTitle: { fontSize: 14.5, fontWeight: '800', color: C.ink, marginBottom: 6 },
  knowBody: { fontSize: 12, color: C.muted, lineHeight: 19 },

  /* AI doctor screen */
  aiScreen: { flex: 1, backgroundColor: C.bg },
  aiHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8 },
  aiHeaderTitle: { fontSize: 24, fontWeight: '900', color: C.ink, letterSpacing: 0.3, marginTop: 2 },
  aiHeaderBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  aiStatusDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: C.surface },
  aiStatusBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 11, marginBottom: 8 },
  aiStatusText: { fontSize: 11.5, fontWeight: '700', marginLeft: 7, flex: 1 },
  aiScroll: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 16 },

  aiWelcome: { alignItems: 'center', paddingVertical: 24 },
  aiWelcomeIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', ...SHADOW.glowPrimary },
  aiWelcomeTitle: { fontSize: 18, fontWeight: '900', color: C.ink, marginTop: 14 },
  aiWelcomeSub: { fontSize: 13, color: C.muted, lineHeight: 20, textAlign: 'center', marginTop: 8, paddingHorizontal: 6 },
  aiCapRow: { flexDirection: 'row', marginTop: 18, alignSelf: 'stretch', justifyContent: 'space-between' },
  aiCapCell: { flex: 1, alignItems: 'center', backgroundColor: C.surfaceMuted, borderRadius: 14, paddingVertical: 14, marginHorizontal: 4 },
  aiCapText: { fontSize: 12, color: C.inkSoft, fontWeight: '700', marginTop: 7 },
  aiSectionLabel: { fontSize: 12.5, fontWeight: '800', color: C.inkSoft, letterSpacing: 0.5, marginTop: 18, marginBottom: 10 },
  aiPatientRow: {},
  aiPatientChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10, ...SHADOW.card },
  aiPatientName: { fontSize: 14.5, fontWeight: '800', color: C.ink },
  aiPatientMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  aiQuickChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primaryTint, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, marginRight: 8, marginBottom: 9 },
  aiQuickText: { color: C.primaryDeep, fontSize: 12.5, fontWeight: '800', marginLeft: 6 },

  aiRowUser: { alignItems: 'flex-end', marginTop: 14 },
  aiBubbleUser: { maxWidth: '82%', backgroundColor: C.primaryDeep, borderRadius: 18, borderBottomRightRadius: 5, paddingHorizontal: 14, paddingVertical: 11, ...SHADOW.card },
  aiBubbleUserText: { color: C.white, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  aiRowBot: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 14 },
  aiAvatar: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 9, marginTop: 2 },
  aiBubbleBot: { flex: 1, backgroundColor: C.surface, borderRadius: 18, borderTopLeftRadius: 5, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 12, ...SHADOW.card },
  aiThinking: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  aiDemoTag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: C.amberTint, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, marginBottom: 8 },
  aiDemoTagText: { color: C.amberDeep, fontSize: 10.5, fontWeight: '800', marginLeft: 4, letterSpacing: 0.3 },
  aiErrText: { color: C.coralDeep, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  aiDisclaimer: { fontSize: 11, color: C.faint, textAlign: 'center', marginTop: 18, lineHeight: 17, paddingHorizontal: 10 },

  aiComposer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 8 : 10, marginBottom: Platform.OS === 'ios' ? 96 : 88, backgroundColor: C.bg },
  aiInputBox: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, justifyContent: 'center', paddingHorizontal: 14, marginRight: 10, ...SHADOW.card },
  aiInput: { color: C.ink, fontSize: 15, paddingVertical: Platform.OS === 'ios' ? 12 : 8 },
  aiSendWrap: SHADOW.glowPrimary,
  aiSendBtn: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  /* AI config modal */
  aiKeyNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.primaryTint, borderRadius: 12, padding: 12, marginBottom: 16 },
  aiKeyNoteText: { flex: 1, color: C.primaryDeep, fontSize: 12, lineHeight: 18, fontWeight: '600', marginLeft: 8 },
  aiProviderHint: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginTop: -2 },
  aiProviderHintText: { color: C.muted, fontSize: 11.5, marginLeft: 6, flex: 1, fontWeight: '600' },
});
