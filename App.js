import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Dimensions, KeyboardAvoidingView, Modal, Platform,
  SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput,
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
  { id: 'a1', patient: '李明', date: '2026-04-26', grip: 22, rom: 66, pain: 2, adl: 72, score: 78, note: '握力提升，建议继续低阻力主动训练。' },
  { id: 'a2', patient: '王阿姨', date: '2026-04-25', grip: 15, rom: 48, pain: 4, adl: 58, score: 64, note: '腕部活动度仍受限，需增加热身与被动活动。' },
];
const initialPrescriptions = [
  { id: 'rx1', patient: '李明', title: '手指分离控制训练', intensity: '中等', frequency: '每日 2 次', duration: '15 分钟', status: '执行中', focus: '精细动作、抓握稳定性' },
  { id: 'rx2', patient: '王阿姨', title: '腕关节活动度恢复', intensity: '轻柔', frequency: '每日 3 次', duration: '10 分钟', status: '待确认', focus: '屈伸活动度、疼痛控制' },
];
const initialRecords = [
  { id: 'r1', patient: '李明', type: '抓握训练', date: '2026-04-26', duration: 18, completion: 92, score: 86 },
  { id: 'r2', patient: '王阿姨', type: '腕部活动', date: '2026-04-25', duration: 12, completion: 78, score: 73 },
  { id: 'r3', patient: '李明', type: '精细动作', date: '2026-04-24', duration: 15, completion: 88, score: 81 },
];
const initialReports = [
  { id: 'rp1', patient: '李明', title: '第4周康复进展报告', date: '2026-04-26', status: '已生成', summary: '本周握力与完成率均有提升，建议维持当前强度并增加手指分离任务。' },
  { id: 'rp2', patient: '王阿姨', title: '术后活动度评估报告', date: '2026-04-25', status: '待复核', summary: '疼痛评分下降，腕部活动度恢复偏慢，建议延长热敷和低角度主动训练。' },
];
const initialStorage = [
  { id: 's1', title: '评估量表模板', type: '模板', owner: '系统', updated: '2026-04-21', size: '124 KB' },
  { id: 's2', title: '李明-训练曲线原始数据', type: '数据', owner: '张医生', updated: '2026-04-26', size: '2.1 MB' },
  { id: 's3', title: '患者知情同意书', type: '文档', owner: '管理员', updated: '2026-04-18', size: '430 KB' },
];
const initialTasks = [
  { id: 't1', title: '李明 15:00 复评', meta: '握力 + ROM', priority: '高', done: false },
  { id: 't2', title: '王阿姨处方复核', meta: '术后第2周', priority: '中', done: false },
  { id: 't3', title: '同步手套 A01 数据', meta: '设备中心', priority: '低', done: true },
];
const tabs = [
  { key: 'workbench', label: '工作台', icon: 'grid-outline', activeIcon: 'grid' },
  { key: 'device', label: '设备', icon: 'hardware-chip-outline', activeIcon: 'hardware-chip' },
  { key: 'training', label: '训练', icon: 'pulse-outline', activeIcon: 'pulse' },
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
    storage: initialStorage, tasks: initialTasks,
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
          <Text style={styles.loginSubtitle}>智能手部康复 · 数据驱动的训练管理</Text>
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
function WorkbenchScreen({ user, patients, devices, assessments, records, reports, tasks, setTasks, openFlow, goTab }) {
  const onlineDevices = devices.filter((d) => d.status === 'online').length;
  const avgCompletion = records.length ? Math.round(records.reduce((sum, item) => sum + item.completion, 0) / records.length) : 0;
  const latestScore = assessments[0] ? assessments[0].score : 0;
  const highTasks = tasks.filter((t) => t.priority === '高' && !t.done).length;
  const doneCount = tasks.filter((t) => t.done).length;
  const recentScores = records.slice(0, 7).map((r) => r.score).reverse();
  const quickActions = [
    { title: '新建评估', caption: '握力 · ROM · 疼痛', icon: 'clipboard-outline', gradient: G.primary, action: () => openFlow('assessment') },
    { title: '生成处方', caption: '智能训练建议', icon: 'medkit-outline', gradient: G.coral, action: () => openFlow('prescription') },
    { title: '开始训练', caption: '互动抓握模拟', icon: 'play-outline', gradient: G.amber, action: () => goTab('training') },
    { title: '数据报告', caption: '趋势与归档', icon: 'document-text-outline', gradient: G.lavender, action: () => goTab('data') },
  ];
  const toggleTask = (id) => setTasks((prev) => prev.map((item) => item.id === id ? { ...item, done: !item.done } : item));

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
                <Text style={styles.wbBigNum}>{avgCompletion}</Text>
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

      <SectionHeader num="02" eyebrow="PATIENTS" title="重点患者" subtitle="今日需要关注的康复进度" action="全部" onAction={() => goTab('training')} />
      {patients[0] && <FeaturedPatient patient={patients[0]} assessments={assessments} records={records} />}
      {patients.slice(1).map((patient) => <PatientRow key={patient.id} patient={patient} />)}

      <SectionHeader num="03" eyebrow="TODAY" eyebrowColor={C.coralDeep} title="今日任务" subtitle={`已完成 ${doneCount} / ${tasks.length}`} />
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

      <SectionHeader num="04" eyebrow="QUICK FLOW" eyebrowColor={C.amberDeep} title="快捷操作" subtitle="常用工作流一键开始" />
      <View style={styles.quickGrid}>
        {quickActions.map((item, idx) => (
          <TouchableOpacity key={item.title} activeOpacity={0.85} onPress={item.action} style={styles.quickCard}>
            <View style={styles.quickCardHead}>
              <IconTile icon={item.icon} dim={44} gradient={item.gradient} />
              <Text style={styles.quickNum}>{String(idx + 1).padStart(2, '0')}</Text>
            </View>
            <Text style={styles.quickTitle}>{item.title}</Text>
            <Text style={styles.quickCaption}>{item.caption}</Text>
            <View style={styles.quickArrow}>
              <Ionicons name="arrow-forward" size={14} color={C.primaryDeep} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
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
function DeviceScreen({ devices, setDevices }) {
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
    { key: 'prescription', label: '处方', icon: 'medkit-outline' },
    { key: 'game', label: '互动训练', icon: 'game-controller-outline' },
  ];
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <PageHeader num="·" eyebrow="TRAINING" title="训练中心" subtitle="患者建档 · 评估 · 处方 · 互动训练" />
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
      {patients.length === 0 && <EmptyState icon="people-outline" title="暂无患者档案" caption="先建立患者档案，再录入评估和训练处方。" action="新增患者" onAction={() => setShowAdd(true)} />}
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
    setAssessments((prev) => [{ id: uid('a'), patient: form.patient.trim(), date: today, grip, rom, pain, adl, score: scoreAssessment(grip, rom, pain, adl), note: form.note.trim() || '已完成基础评估，建议结合处方训练。' }, ...prev]);
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
      <SectionHeader num="·" eyebrow="PRESCRIPTION" title="康复处方" action="智能生成" onAction={() => setShowAdd(true)} />
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
            <PrimaryButton label={running ? '暂停处方' : '开始执行'} icon={running ? 'pause' : 'play'} tone={running ? 'ghost' : 'primary'} onPress={() => toggleStatus(item.id)} />
          </Card>
        );
      })}
      <ModalSheet visible={showAdd} title="智能生成处方" subtitle="生成结果仍需医生或康复师确认" onClose={() => setShowAdd(false)}>
        <Text style={styles.inputLabel}>患者</Text>
        <View style={styles.chipRow}>{patients.map((patient) => <Chip key={patient.id} label={patient.name} active={form.patient === patient.name} onPress={() => setForm((p) => ({ ...p, patient: patient.name }))} />)}</View>
        <Text style={styles.inputLabel}>训练重点</Text>
        <View style={styles.chipRow}>{['抓握稳定性', '手指分离', '腕部活动度', '精细动作'].map((item) => <Chip key={item} label={item} active={form.focus === item} onPress={() => setForm((p) => ({ ...p, focus: item }))} />)}</View>
        <Text style={styles.inputLabel}>训练强度</Text>
        <View style={styles.chipRow}>{['轻柔', '中等', '进阶'].map((item) => <Chip key={item} label={item} active={form.intensity === item} onPress={() => setForm((p) => ({ ...p, intensity: item }))} />)}</View>
        <InputField label="单次时长（分钟）" icon="time-outline" value={form.duration} onChangeText={(v) => setForm((p) => ({ ...p, duration: v }))} keyboardType="numeric" placeholder="15" />
        <PrimaryButton label="生成处方" icon="sparkles" onPress={addPrescription} />
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
    setReports((prev) => [{ id: uid('rp'), patient: reportForm.patient.trim() || '未命名', title: reportForm.title.trim() || '康复报告', date: today, status: '已生成', summary: reportForm.summary.trim() || '系统已根据训练记录生成阶段报告，建议结合医生复核后用于正式归档。' }, ...prev]);
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <PageHeader num="·" eyebrow="DATA HUB" title="数据中心" subtitle="训练记录 · 康复报告 · 趋势分析" />
      <SegmentedControl items={tabItems} value={subTab} onChange={setSubTab} />
      {subTab === 'records' && <RecordsPanel records={records} onAdd={() => setShowRecord(true)} onRemove={removeRecord} />}
      {subTab === 'reports' && <ReportsPanel reports={reports} onAdd={() => setShowReport(true)} onView={setViewReport} onRemove={removeReport} />}
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

function ReportsPanel({ reports, onAdd, onView, onRemove }) {
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
            <PrimaryButton label="导出" icon="download-outline" onPress={() => Alert.alert('导出准备中', '报告导出正在准备中，稍后可在数据中心查看。')} style={styles.flex} />
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
function ProfileScreen({ user, setUser, onLogout, onDeleteAccount, onUpdateUser }) {
  const [showEdit, setShowEdit] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [settings, setSettings] = useState({ notification: true, cloud: true, privacy: true });
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
        <ProfileMenu icon="cloud-done-outline" tone="lavender" title="数据保存" caption="患者档案、训练记录和报告自动保存" onPress={() => Alert.alert('数据保存', '系统会自动保存当前工作区的数据，并保持各模块信息一致。')} last />
      </Card>

      <SectionHeader num="·" eyebrow="SETTINGS" eyebrowColor={'#194E85'} title="系统设置" />
      <Card style={styles.menuCard}>
        <SettingRow icon="notifications-outline" tone="amber" label="康复提醒通知" value={settings.notification} onValueChange={(v) => setSettings((p) => ({ ...p, notification: v }))} />
        <SettingRow icon="sync-outline" tone="primary" label="训练数据自动同步" value={settings.cloud} onValueChange={(v) => setSettings((p) => ({ ...p, cloud: v }))} />
        <SettingRow icon="eye-off-outline" tone="lavender" label="隐私保护模式" value={settings.privacy} onValueChange={(v) => setSettings((p) => ({ ...p, privacy: v }))} last />
      </Card>

      <SectionHeader num="·" eyebrow="LEGAL" eyebrowColor={'#5E418A'} title="合规与更多" />
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
        <Text style={styles.detailParagraph}>健康守护者是一款面向手部康复训练场景的移动端应用，包含患者档案、设备管理、评估记录、训练处方、互动训练、数据报告、账号体系和数据删除能力。</Text>
        <Text style={styles.detailParagraph}>应用面向康复机构、康复师和家庭随访场景，帮助用户记录训练过程、追踪康复趋势，并提升日常康复管理效率。</Text>
        <PrimaryButton label="我知道了" icon="checkmark" onPress={() => setShowAbout(false)} />
      </ModalSheet>
      <ModalSheet visible={showPrivacy} title="隐私政策" subtitle="隐私与数据说明" onClose={() => setShowPrivacy(false)}>
        <Text style={styles.detailParagraph}>我们会保存你注册时填写的邮箱、姓名、身份，以及在 App 内创建的患者档案、设备状态、评估记录、训练处方、训练记录、报告和资料条目。</Text>
        <Text style={styles.detailParagraph}>这些数据仅用于账号登录、康复管理、训练记录、报告展示和服务安全，不用于广告画像，不向第三方出售。</Text>
        <Text style={styles.detailParagraph}>你可以在"我的 - 注销账号与删除数据"中删除当前账号及相关数据。删除完成后，该账号无法继续登录，关联数据会从系统中移除。</Text>
        <PrimaryButton label="关闭" icon="checkmark" onPress={() => setShowPrivacy(false)} />
      </ModalSheet>
      <ModalSheet visible={showAgreement} title="用户协议" subtitle="服务范围与健康提示" onClose={() => setShowAgreement(false)}>
        <Text style={styles.detailParagraph}>健康守护者提供康复过程记录、设备管理、评估数据录入、训练处方生成、互动训练和阶段报告等功能。</Text>
        <Text style={styles.detailParagraph}>本应用用于康复管理辅助，不提供医疗诊断，不替代医生、康复师或其他专业医疗人员意见，也不用于紧急医疗服务。</Text>
        <Text style={styles.detailParagraph}>用户应确保录入信息真实、合法，并结合专业人员建议进行训练和康复决策。</Text>
        <PrimaryButton label="同意并关闭" icon="checkmark" onPress={() => setShowAgreement(false)} />
      </ModalSheet>
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

function SettingRow({ icon, tone, label, value, onValueChange, last }) {
  return (
    <View style={[styles.profileMenu, !last && styles.rowDivider]}>
      <IconTile icon={icon} dim={40} size={20} tone={tone} />
      <Text style={[styles.flex, styles.profileMenuTitle, { marginLeft: 12 }]}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#D7DCE1', true: C.primary }} thumbColor={C.white} ios_backgroundColor="#D7DCE1" />
    </View>
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
      ? { title: '快捷生成处方', subtitle: '生成一条待确认训练处方', label: '单次时长（分钟）', placeholder: '15', button: '生成处方', icon: 'medkit-outline' }
      : { title: '快捷生成报告', subtitle: '生成一份可查看的阶段总结', label: '报告标题', placeholder: '阶段康复报告', button: '生成报告', icon: 'document-text-outline' };
  const submit = () => {
    if (flow === 'assessment') {
      const score = clamp(Number(value || 0), 0, 100);
      addAssessment({ id: uid('a'), patient, date: today, grip: Math.round(score / 3), rom: score, pain: score > 75 ? 2 : 4, adl: score, score, note: note || '工作台快捷录入评估。' });
    } else if (flow === 'prescription') {
      addPrescription({ id: uid('rx'), patient, title: '快捷康复训练处方', intensity: '中等', frequency: '每日 2 次', duration: (value || 15) + ' 分钟', status: '待确认', focus: note || '抓握稳定性、精细动作' });
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
  };
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
      const appData = { patients, devices, assessments, prescriptions, records, reports, storage, tasks };
      if (token === WORKSPACE_TOKEN) {
        Storage.setItem(WORKSPACE_DATA_KEY, JSON.stringify(appData)).catch((error) => console.warn('Local save failed', error.message));
        return;
      }
      if (!cloudReady) return;
      apiRequest('/api/app-data', { method: 'PUT', token, body: { appData } }).catch((error) => console.warn('Sync failed', error.message));
    }, 900);
    return () => { if (persistTimer.current) clearTimeout(persistTimer.current); };
  }, [token, user, cloudReady, patients, devices, assessments, prescriptions, records, reports, storage, tasks]);

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
    if (activeTab === 'device') return <DeviceScreen devices={devices} setDevices={setDevices} />;
    if (activeTab === 'training') return <TrainingScreen patients={patients} setPatients={setPatients} assessments={assessments} setAssessments={setAssessments} prescriptions={prescriptions} setPrescriptions={setPrescriptions} records={records} setRecords={setRecords} />;
    if (activeTab === 'data') return <DataScreen records={records} setRecords={setRecords} reports={reports} setReports={setReports} storage={storage} />;
    if (activeTab === 'profile') return <ProfileScreen user={user} setUser={setUser} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} onUpdateUser={handleUpdateUser} />;
    return <WorkbenchScreen user={user} patients={patients} devices={devices} assessments={assessments} records={records} reports={reports} tasks={tasks} setTasks={setTasks} openFlow={setFlow} goTab={setActiveTab} />;
  };

  return (
    <SafeAreaView style={styles.appRoot}>
      <StatusBar style="dark" />
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
});
