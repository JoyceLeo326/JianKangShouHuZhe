import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const now = new Date();
const today = formatLocalDate(now);
const todayWeekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];

const C = {
  bg: '#F4F7FA',
  surface: '#FFFFFF',
  soft: '#EEF7F7',
  text: '#18212F',
  muted: '#657386',
  line: '#E4EAF1',
  primary: '#1A9A9B',
  primaryDark: '#117C7D',
  blue: '#2F80ED',
  navy: '#1F3A5F',
  green: '#2EAD6B',
  yellow: '#F6B23C',
  red: '#D84E4E',
  purple: '#7067CF',
};

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://172.20.10.13:3001').replace(/\/$/, '');
const AUTH_TOKEN_KEY = 'jkshz_auth_token';
const OFFLINE_TOKEN = 'offline_demo_token';
const OFFLINE_USER_KEY = 'jkshz_offline_user';
const OFFLINE_DATA_KEY = 'jkshz_offline_app_data';
const DEFAULT_OFFLINE_USER = {
  id: 'offline_demo',
  email: 'demo@jiankang.local',
  name: '张医生',
  role: '康复师',
};

async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data.message || '服务器请求失败');
  }
  return data;
}

const initialPatients = [
  { id: 'p1', name: '李明', age: '62', diagnosis: '脑卒中恢复期', side: '右手', stage: '第4周', risk: '低风险', next: '今天 15:00', phone: '13800000001' },
  { id: 'p2', name: '王阿姨', age: '68', diagnosis: '腕关节术后', side: '左手', stage: '第2周', risk: '中风险', next: '明天 10:30', phone: '13800000002' },
];

const initialDevices = [
  { id: 'd1', name: '智能握力手套 A01', type: '康复手套', status: 'online', battery: 82, signal: 94, patient: '李明', lastSync: '3分钟前' },
  { id: 'd2', name: '腕部活动度传感器 B12', type: '角度传感器', status: 'online', battery: 57, signal: 76, patient: '王阿姨', lastSync: '18分钟前' },
  { id: 'd3', name: '肌张力采集器 C07', type: '肌电设备', status: 'offline', battery: 21, signal: 0, patient: '未绑定', lastSync: '昨天 19:20' },
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
  { key: 'workbench', label: '工作台', icon: 'home-outline', activeIcon: 'home' },
  { key: 'device', label: '设备', icon: 'hardware-chip-outline', activeIcon: 'hardware-chip' },
  { key: 'training', label: '训练', icon: 'fitness-outline', activeIcon: 'fitness' },
  { key: 'data', label: '数据', icon: 'analytics-outline', activeIcon: 'analytics' },
  { key: 'profile', label: '我的', icon: 'person-outline', activeIcon: 'person' },
];

function uid(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scoreAssessment(grip, rom, pain, adl) {
  return clamp(Math.round(Number(grip) * 1.2 + Number(rom) * 0.35 + Number(adl) * 0.35 - Number(pain) * 4), 0, 100);
}

function defaultAppData() {
  return {
    patients: initialPatients,
    devices: initialDevices,
    assessments: initialAssessments,
    prescriptions: initialPrescriptions,
    records: initialRecords,
    reports: initialReports,
    storage: initialStorage,
    tasks: initialTasks,
  };
}

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function IconBubble({ icon, color, bg, size }) {
  return (
    <View style={[styles.iconBubble, { backgroundColor: bg || C.soft }]}> 
      <Ionicons name={icon} size={size || 22} color={color || C.primary} />
    </View>
  );
}

function SectionHeader({ title, subtitle, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTextWrap}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {!!action && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.82} style={styles.textAction}>
          <Text style={styles.textActionLabel}>{action}</Text>
          <Ionicons name="chevron-forward" size={15} color={C.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function PrimaryButton({ label, icon, onPress, tone, style, disabled }) {
  const isGhost = tone === 'ghost';
  const colors = { primary: C.primary, navy: C.navy, green: C.green, red: C.red, yellow: C.yellow, ghost: C.surface };
  const bg = disabled ? '#A8B4C0' : colors[tone || 'primary'];
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, { backgroundColor: bg, borderWidth: isGhost ? 1 : 0, borderColor: C.line }, style]}
    >
      {!!icon && <Ionicons name={icon} size={18} color={isGhost ? C.text : '#FFFFFF'} style={styles.buttonIcon} />}
      <Text style={[styles.primaryButtonText, isGhost && styles.ghostButtonText]}>{label}</Text>
    </TouchableOpacity>
  );
}

function InputField({ label, icon, value, onChangeText, placeholder, keyboardType, secureTextEntry, right }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputBox}>
        {!!icon && <Ionicons name={icon} size={19} color={C.muted} style={styles.inputIcon} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A3ADBA"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          style={styles.input}
          autoCapitalize="none"
        />
        {right}
      </View>
    </View>
  );
}

function Chip({ label, active, onPress, color }) {
  const activeColor = color || C.primary;
  return (
    <TouchableOpacity activeOpacity={0.78} onPress={onPress} style={[styles.chip, active && { backgroundColor: activeColor + '18', borderColor: activeColor }]}>
      <Text style={[styles.chipText, active && { color: activeColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ProgressBar({ value, color, height }) {
  return (
    <View style={[styles.progressTrack, { height: height || 9 }]}> 
      <View style={[styles.progressFill, { width: clamp(value, 0, 100) + '%', backgroundColor: color || C.primary }]} />
    </View>
  );
}

function MetricCard({ icon, label, value, caption, color }) {
  const mainColor = color || C.primary;
  return (
    <Card style={styles.metricCard}>
      <IconBubble icon={icon} color={mainColor} bg={mainColor + '14'} size={20} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {!!caption && <Text style={styles.metricCaption}>{caption}</Text>}
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
            <View style={styles.sectionTextWrap}>
              <Text style={styles.modalTitle}>{title}</Text>
              {!!subtitle && <Text style={styles.modalSubtitle}>{subtitle}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} activeOpacity={0.8}>
              <Ionicons name="close" size={22} color={C.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Header({ user }) {
  return (
    <View style={styles.topHeader}>
      <View>
        <Text style={styles.headerKicker}>{today}  {todayWeekday}</Text>
        <Text style={styles.headerTitle}>你好，{user.name}</Text>
      </View>
      <TouchableOpacity style={styles.noticeButton} activeOpacity={0.8} onPress={() => Alert.alert('通知', '你有 2 条待处理提醒。')}>
        <Ionicons name="notifications-outline" size={22} color={C.text} />
        <View style={styles.noticeDot} />
      </TouchableOpacity>
    </View>
  );
}

function SegmentedControl({ items, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentWrap}>
      {items.map((item) => (
        <TouchableOpacity key={item.key} activeOpacity={0.82} onPress={() => onChange(item.key)} style={[styles.segmentItem, value === item.key && styles.segmentItemActive]}>
          <Ionicons name={item.icon} size={16} color={value === item.key ? '#FFFFFF' : C.muted} />
          <Text style={[styles.segmentText, value === item.key && styles.segmentTextActive]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function LoginScreen({ onLogin, onOfflineDemo }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [account, setAccount] = useState('demo@jiankang.local');
  const [password, setPassword] = useState('12345678');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('康复师');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!account.trim()) {
      Alert.alert('提示', '请输入邮箱');
      return;
    }
    if (!password.trim() || password.length < 8) {
      Alert.alert('提示', '请输入至少 8 位密码');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      Alert.alert('提示', '请输入姓名');
      return;
    }
    try {
      setSubmitting(true);
      const data = await apiRequest(mode === 'register' ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        body: {
          email: account.trim(),
          password,
          name: name.trim() || '张医生',
          role,
        },
      });
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
      onLogin(data);
    } catch (error) {
      Alert.alert('登录失败', error.message || '请检查账号、密码或后端服务是否启动。也可以先使用离线演示模式。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.loginPage}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
        <View style={styles.loginBrand}>
          <View style={styles.brandMark}>
            <Ionicons name="heart-circle" size={54} color="#FFFFFF" />
          </View>
          <Text style={styles.loginTitle}>健康守护者</Text>
          <Text style={styles.loginSubtitle}>智能手部康复训练与数据管理平台</Text>
        </View>

        <Card style={styles.loginCard}>
          <View style={styles.loginSwitch}>
            <TouchableOpacity style={[styles.loginSwitchItem, mode === 'login' && styles.loginSwitchActive]} onPress={() => setMode('login')} activeOpacity={0.82}>
              <Text style={[styles.loginSwitchText, mode === 'login' && styles.loginSwitchTextActive]}>登录</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.loginSwitchItem, mode === 'register' && styles.loginSwitchActive]} onPress={() => setMode('register')} activeOpacity={0.82}>
              <Text style={[styles.loginSwitchText, mode === 'register' && styles.loginSwitchTextActive]}>注册</Text>
            </TouchableOpacity>
          </View>

          {mode === 'register' && <InputField label="姓名" icon="person-outline" value={name} onChangeText={setName} placeholder="请输入真实姓名" />}
          <InputField label="邮箱" icon="mail-outline" value={account} onChangeText={setAccount} placeholder="请输入邮箱" />
          <InputField
            label="密码"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="至少 8 位"
            secureTextEntry={!showPassword}
            right={(
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
              </TouchableOpacity>
            )}
          />

          <Text style={styles.inputLabel}>身份</Text>
          <View style={styles.chipRow}>
            {['康复师', '医生', '管理员'].map((item) => <Chip key={item} label={item} active={role === item} onPress={() => setRole(item)} />)}
          </View>

          <PrimaryButton disabled={submitting} label={submitting ? '正在连接服务器' : mode === 'login' ? '进入系统' : '创建并进入'} icon="log-in-outline" onPress={submit} style={styles.loginSubmit} />
          <View style={styles.demoAccount}>
            <Ionicons name="shield-checkmark-outline" size={16} color={C.primary} />
            <Text style={styles.demoText}>演示账号：demo@jiankang.local / 12345678</Text>
          </View>
          <PrimaryButton label="离线演示模式" icon="phone-portrait-outline" tone="ghost" onPress={onOfflineDemo} style={styles.offlineButton} />
          <Text style={styles.serverHint}>评委不在同一网络或服务器未启动时，可直接使用离线演示模式。</Text>
          <Text style={styles.serverHint}>服务器：{API_BASE_URL}</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function WorkbenchScreen({ user, patients, devices, assessments, records, reports, tasks, setTasks, openFlow, goTab }) {
  const onlineDevices = devices.filter((d) => d.status === 'online').length;
  const avgCompletion = Math.round(records.reduce((sum, item) => sum + item.completion, 0) / records.length);
  const latestScore = assessments[0] ? assessments[0].score : 0;
  const quickActions = [
    { title: '新建评估', caption: '快速记录握力与活动度', icon: 'clipboard-outline', color: C.primary, action: () => openFlow('assessment') },
    { title: '生成处方', caption: '根据评估生成训练建议', icon: 'medical-outline', color: C.green, action: () => openFlow('prescription') },
    { title: '开始训练', caption: '进入游戏化训练', icon: 'play-circle-outline', color: C.yellow, action: () => goTab('training') },
    { title: '数据报告', caption: '查看趋势与报告', icon: 'document-text-outline', color: C.purple, action: () => goTab('data') },
  ];
  const toggleTask = (id) => setTasks((prev) => prev.map((item) => item.id === id ? { ...item, done: !item.done } : item));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <Header user={user} />
      <View style={styles.heroPanel}>
        <View style={styles.heroText}>
          <Text style={styles.heroKicker}>今日康复概览</Text>
          <Text style={styles.heroTitle}>重点患者 {patients.length} 位，设备在线 {onlineDevices} 台</Text>
          <Text style={styles.heroSubtitle}>建议优先完成高优先级复评，并同步训练数据后生成报告。</Text>
        </View>
        <View style={styles.heroIcon}>
          <Ionicons name="pulse-outline" size={42} color="#FFFFFF" />
        </View>
      </View>

      <View style={styles.metricGrid}>
        <MetricCard icon="people-outline" label="患者" value={String(patients.length)} caption="在管人数" color={C.blue} />
        <MetricCard icon="trending-up-outline" label="完成率" value={avgCompletion + '%'} caption="近 7 天" color={C.green} />
        <MetricCard icon="analytics-outline" label="评估" value={String(latestScore)} caption="最新评分" color={C.primary} />
        <MetricCard icon="document-text-outline" label="报告" value={String(reports.length)} caption="累计生成" color={C.purple} />
      </View>

      <SectionHeader title="快捷操作" subtitle="常用流程一键开始" />
      <View style={styles.quickGrid}>
        {quickActions.map((item) => (
          <TouchableOpacity key={item.title} activeOpacity={0.84} onPress={item.action} style={styles.quickCard}>
            <IconBubble icon={item.icon} color={item.color} bg={item.color + '14'} />
            <Text style={styles.quickTitle}>{item.title}</Text>
            <Text style={styles.quickCaption}>{item.caption}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionHeader title="今日任务" subtitle="点击左侧圆点可标记完成" />
      <Card>
        {tasks.map((task, index) => (
          <TouchableOpacity key={task.id} style={[styles.taskRow, index !== tasks.length - 1 && styles.rowDivider]} onPress={() => toggleTask(task.id)} activeOpacity={0.8}>
            <View style={[styles.taskCheck, task.done && styles.taskCheckDone]}>{task.done && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}</View>
            <View style={styles.flex}>
              <Text style={[styles.taskTitle, task.done && styles.doneText]}>{task.title}</Text>
              <Text style={styles.taskMeta}>{task.meta}</Text>
            </View>
            <PriorityBadge value={task.priority} />
          </TouchableOpacity>
        ))}
      </Card>

      <SectionHeader title="最近患者" action="查看训练" onAction={() => goTab('training')} />
      {patients.map((patient) => <PatientSummary key={patient.id} patient={patient} />)}
    </ScrollView>
  );
}

function PriorityBadge({ value }) {
  const color = value === '高' ? C.red : value === '中' ? C.yellow : C.green;
  return (
    <View style={[styles.priorityBadge, { backgroundColor: color + '18' }]}>
      <Text style={[styles.priorityText, { color }]}>{value}</Text>
    </View>
  );
}

function PatientSummary({ patient }) {
  return (
    <Card style={styles.patientSummary}>
      <View style={styles.patientAvatar}><Ionicons name="person" size={22} color={C.primary} /></View>
      <View style={styles.flex}>
        <Text style={styles.patientName}>{patient.name}</Text>
        <Text style={styles.patientMeta}>{patient.diagnosis} · {patient.side} · {patient.stage}</Text>
        <Text style={styles.patientNext}>下次安排：{patient.next}</Text>
      </View>
      <View style={[styles.riskBadge, patient.risk === '中风险' && styles.riskBadgeWarn]}>
        <Text style={[styles.riskText, patient.risk === '中风险' && styles.riskTextWarn]}>{patient.risk}</Text>
      </View>
    </Card>
  );
}

function DeviceScreen({ devices, setDevices }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('康复手套');
  const [patient, setPatient] = useState('');
  const onlineCount = devices.filter((item) => item.status === 'online').length;

  const toggleDevice = (id) => {
    setDevices((prev) => prev.map((item) => item.id === id ? {
      ...item,
      status: item.status === 'online' ? 'offline' : 'online',
      signal: item.status === 'online' ? 0 : 88,
      lastSync: item.status === 'online' ? item.lastSync : '刚刚',
    } : item));
  };

  const syncDevice = (id) => {
    setDevices((prev) => prev.map((item) => item.id === id ? { ...item, lastSync: '刚刚', signal: item.status === 'online' ? 96 : item.signal } : item));
    Alert.alert('同步完成', '设备数据已更新到数据中心。');
  };

  const addDevice = () => {
    if (!name.trim()) {
      Alert.alert('提示', '请输入设备名称');
      return;
    }
    setDevices((prev) => [{ id: uid('d'), name: name.trim(), type, status: 'online', battery: 100, signal: 92, patient: patient.trim() || '未绑定', lastSync: '刚刚' }, ...prev]);
    setName('');
    setPatient('');
    setShowAdd(false);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>设备管理</Text>
          <Text style={styles.pageSubtitle}>在线 {onlineCount} 台 · 共 {devices.length} 台设备</Text>
        </View>
        <TouchableOpacity style={styles.roundAdd} onPress={() => setShowAdd(true)} activeOpacity={0.82}><Ionicons name="add" size={24} color="#FFFFFF" /></TouchableOpacity>
      </View>

      <Card style={styles.deviceSummary}>
        <View style={styles.deviceSummaryItem}><Text style={styles.bigNumber}>{onlineCount}</Text><Text style={styles.smallLabel}>在线设备</Text></View>
        <View style={styles.deviceSummaryDivider} />
        <View style={styles.deviceSummaryItem}><Text style={styles.bigNumber}>{Math.round(devices.reduce((sum, d) => sum + d.battery, 0) / devices.length)}%</Text><Text style={styles.smallLabel}>平均电量</Text></View>
        <View style={styles.deviceSummaryDivider} />
        <View style={styles.deviceSummaryItem}><Text style={styles.bigNumber}>稳定</Text><Text style={styles.smallLabel}>网络状态</Text></View>
      </Card>

      {devices.map((device) => <DeviceCard key={device.id} device={device} onToggle={() => toggleDevice(device.id)} onSync={() => syncDevice(device.id)} />)}

      <ModalSheet visible={showAdd} title="添加设备" subtitle="录入后会自动设为在线状态" onClose={() => setShowAdd(false)}>
        <InputField label="设备名称" icon="hardware-chip-outline" value={name} onChangeText={setName} placeholder="例如：智能握力手套 A02" />
        <Text style={styles.inputLabel}>设备类型</Text>
        <View style={styles.chipRow}>{['康复手套', '角度传感器', '肌电设备'].map((item) => <Chip key={item} label={item} active={type === item} onPress={() => setType(item)} />)}</View>
        <InputField label="绑定患者" icon="person-outline" value={patient} onChangeText={setPatient} placeholder="可暂不填写" />
        <PrimaryButton label="保存设备" icon="checkmark-circle-outline" onPress={addDevice} />
      </ModalSheet>
    </ScrollView>
  );
}

function DeviceCard({ device, onToggle, onSync }) {
  const online = device.status === 'online';
  const batteryColor = device.battery > 60 ? C.green : device.battery > 30 ? C.yellow : C.red;
  const icon = device.type === '肌电设备' ? 'pulse-outline' : device.type === '角度传感器' ? 'radio-outline' : 'hand-left-outline';
  return (
    <Card style={styles.deviceCard}>
      <View style={styles.deviceTop}>
        <IconBubble icon={icon} color={online ? C.primary : C.muted} bg={online ? C.soft : '#F1F3F5'} />
        <View style={styles.flex}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <Text style={styles.deviceType}>{device.type} · 绑定：{device.patient}</Text>
        </View>
        <View style={[styles.onlineBadge, !online && styles.offlineBadge]}><Text style={[styles.onlineText, !online && styles.offlineText]}>{online ? '在线' : '离线'}</Text></View>
      </View>

      <View style={styles.deviceMetrics}>
        <View style={styles.deviceMetric}><Text style={styles.deviceMetricLabel}>电量</Text><Text style={[styles.deviceMetricValue, { color: batteryColor }]}>{device.battery}%</Text><ProgressBar value={device.battery} color={batteryColor} height={7} /></View>
        <View style={styles.deviceMetric}><Text style={styles.deviceMetricLabel}>信号</Text><Text style={styles.deviceMetricValue}>{device.signal}%</Text><ProgressBar value={device.signal} color={online ? C.blue : '#BBC5CF'} height={7} /></View>
      </View>

      <View style={styles.cardActionRow}>
        <Text style={styles.syncText}>上次同步：{device.lastSync}</Text>
        <View style={styles.inlineButtons}>
          <TouchableOpacity onPress={onSync} activeOpacity={0.82} style={styles.smallAction}><Ionicons name="sync-outline" size={15} color={C.primary} /><Text style={styles.smallActionText}>同步</Text></TouchableOpacity>
          <TouchableOpacity onPress={onToggle} activeOpacity={0.82} style={[styles.smallAction, !online && styles.smallActionFilled]}><Ionicons name={online ? 'power-outline' : 'link-outline'} size={15} color={online ? C.red : '#FFFFFF'} /><Text style={[styles.smallActionText, !online && styles.smallActionTextFilled, online && { color: C.red }]}>{online ? '断开' : '连接'}</Text></TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}

function TrainingScreen({ patients, setPatients, assessments, setAssessments, prescriptions, setPrescriptions, records, setRecords }) {
  const [subTab, setSubTab] = useState('patients');
  const tabItems = [
    { key: 'patients', label: '患者', icon: 'people-outline' },
    { key: 'assessment', label: '评估', icon: 'clipboard-outline' },
    { key: 'prescription', label: '处方', icon: 'medical-outline' },
    { key: 'game', label: '游戏训练', icon: 'game-controller-outline' },
  ];
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}>
        <View><Text style={styles.pageTitle}>训练中心</Text><Text style={styles.pageSubtitle}>患者建档、评估、处方、互动训练</Text></View>
      </View>
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
    if (!form.name.trim() || !form.age.trim()) {
      Alert.alert('提示', '请填写姓名和年龄');
      return;
    }
    setPatients((prev) => [{ id: uid('p'), name: form.name.trim(), age: form.age.trim(), diagnosis: form.diagnosis, side: form.side, stage: '第1周', risk: '低风险', next: '待安排', phone: form.phone.trim() }, ...prev]);
    setForm({ name: '', age: '', diagnosis: '脑卒中恢复期', side: '右手', phone: '' });
    setShowAdd(false);
  };

  return (
    <>
      <SectionHeader title="患者档案" action="新增" onAction={() => setShowAdd(true)} />
      {patients.map((patient) => (
        <Card key={patient.id} style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.patientAvatarLarge}><Ionicons name="person" size={28} color={C.primary} /></View>
            <View style={styles.flex}><Text style={styles.profileName}>{patient.name}</Text><Text style={styles.patientMeta}>{patient.age}岁 · {patient.diagnosis}</Text></View>
            <PriorityBadge value={patient.risk === '中风险' ? '中' : '低'} />
          </View>
          <View style={styles.infoGrid}>
            <InfoCell label="患侧" value={patient.side} />
            <InfoCell label="阶段" value={patient.stage} />
            <InfoCell label="下次安排" value={patient.next} />
            <InfoCell label="联系方式" value={patient.phone || '未填写'} />
          </View>
        </Card>
      ))}
      <ModalSheet visible={showAdd} title="新增患者" subtitle="建立患者基础档案" onClose={() => setShowAdd(false)}>
        <InputField label="姓名" icon="person-outline" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="请输入患者姓名" />
        <InputField label="年龄" icon="calendar-outline" value={form.age} onChangeText={(v) => setForm((p) => ({ ...p, age: v }))} placeholder="请输入年龄" keyboardType="numeric" />
        <Text style={styles.inputLabel}>诊断类型</Text>
        <View style={styles.chipRow}>{['脑卒中恢复期', '腕关节术后', '帕金森', '骨折术后'].map((item) => <Chip key={item} label={item} active={form.diagnosis === item} onPress={() => setForm((p) => ({ ...p, diagnosis: item }))} />)}</View>
        <Text style={styles.inputLabel}>患侧</Text>
        <View style={styles.chipRow}>{['左手', '右手', '双手'].map((item) => <Chip key={item} label={item} active={form.side === item} onPress={() => setForm((p) => ({ ...p, side: item }))} />)}</View>
        <InputField label="联系方式" icon="call-outline" value={form.phone} onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))} placeholder="可选" keyboardType="phone-pad" />
        <PrimaryButton label="保存档案" icon="checkmark-circle-outline" onPress={addPatient} />
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
    if (!form.patient.trim()) {
      Alert.alert('提示', '请选择或输入患者');
      return;
    }
    const grip = Number(form.grip || 0);
    const rom = Number(form.rom || 0);
    const pain = Number(form.pain || 0);
    const adl = Number(form.adl || 0);
    setAssessments((prev) => [{ id: uid('a'), patient: form.patient.trim(), date: today, grip, rom, pain, adl, score: scoreAssessment(grip, rom, pain, adl), note: form.note.trim() || '已完成基础评估，建议结合处方训练。' }, ...prev]);
    setShowAdd(false);
  };

  return (
    <>
      <SectionHeader title="评估记录" action="新建评估" onAction={() => setShowAdd(true)} />
      {assessments.map((item) => (
        <Card key={item.id} style={styles.assessmentCard}>
          <View style={styles.cardTopLine}><View><Text style={styles.itemTitle}>{item.patient}</Text><Text style={styles.itemMeta}>{item.date} · 综合评分</Text></View><View style={styles.scoreCircle}><Text style={styles.scoreText}>{item.score}</Text></View></View>
          <View style={styles.assessmentMetrics}><MiniStat label="握力" value={item.grip + 'kg'} /><MiniStat label="活动度" value={item.rom + '%'} /><MiniStat label="疼痛" value={item.pain + '/10'} /><MiniStat label="ADL" value={item.adl + '%'} /></View>
          <Text style={styles.noteText}>{item.note}</Text>
        </Card>
      ))}
      <ModalSheet visible={showAdd} title="新建康复评估" subtitle="录入关键指标后自动计算综合评分" onClose={() => setShowAdd(false)}>
        <Text style={styles.inputLabel}>患者</Text>
        <View style={styles.chipRow}>{patients.map((patient) => <Chip key={patient.id} label={patient.name} active={form.patient === patient.name} onPress={() => setForm((p) => ({ ...p, patient: patient.name }))} />)}</View>
        <InputField label="握力 kg" icon="barbell-outline" value={form.grip} onChangeText={(v) => setForm((p) => ({ ...p, grip: v }))} keyboardType="numeric" placeholder="例如 20" />
        <InputField label="关节活动度 %" icon="radio-outline" value={form.rom} onChangeText={(v) => setForm((p) => ({ ...p, rom: v }))} keyboardType="numeric" placeholder="0-100" />
        <InputField label="疼痛评分" icon="warning-outline" value={form.pain} onChangeText={(v) => setForm((p) => ({ ...p, pain: v }))} keyboardType="numeric" placeholder="0-10" />
        <InputField label="日常生活能力 %" icon="home-outline" value={form.adl} onChangeText={(v) => setForm((p) => ({ ...p, adl: v }))} keyboardType="numeric" placeholder="0-100" />
        <InputField label="备注" icon="create-outline" value={form.note} onChangeText={(v) => setForm((p) => ({ ...p, note: v }))} placeholder="可选" />
        <PrimaryButton label="保存评估" icon="save-outline" onPress={addAssessment} />
      </ModalSheet>
    </>
  );
}

function MiniStat({ label, value }) {
  return <View style={styles.miniStat}><Text style={styles.miniStatValue}>{value}</Text><Text style={styles.miniStatLabel}>{label}</Text></View>;
}

function PrescriptionPanel({ patients, prescriptions, setPrescriptions }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ patient: patients[0] ? patients[0].name : '', focus: '抓握稳定性', intensity: '中等', duration: '15' });
  const addPrescription = () => {
    if (!form.patient.trim()) {
      Alert.alert('提示', '请选择患者');
      return;
    }
    setPrescriptions((prev) => [{ id: uid('rx'), patient: form.patient.trim(), title: form.focus + '训练方案', intensity: form.intensity, frequency: form.intensity === '轻柔' ? '每日 3 次' : '每日 2 次', duration: (form.duration || 15) + ' 分钟', status: '待确认', focus: form.focus }, ...prev]);
    setShowAdd(false);
  };
  const toggleStatus = (id) => setPrescriptions((prev) => prev.map((item) => item.id === id ? { ...item, status: item.status === '执行中' ? '已暂停' : '执行中' } : item));

  return (
    <>
      <SectionHeader title="康复处方" action="智能生成" onAction={() => setShowAdd(true)} />
      {prescriptions.map((item) => (
        <Card key={item.id} style={styles.prescriptionCard}>
          <View style={styles.cardTopLine}><View style={styles.flex}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.itemMeta}>{item.patient} · {item.focus}</Text></View><View style={[styles.statusBadge, item.status !== '执行中' && styles.statusBadgeSoft]}><Text style={[styles.statusText, item.status !== '执行中' && styles.statusTextSoft]}>{item.status}</Text></View></View>
          <View style={styles.rxGrid}><MiniStat label="强度" value={item.intensity} /><MiniStat label="频次" value={item.frequency} /><MiniStat label="时长" value={item.duration} /></View>
          <PrimaryButton label={item.status === '执行中' ? '暂停处方' : '开始执行'} icon={item.status === '执行中' ? 'pause-outline' : 'play-outline'} tone={item.status === '执行中' ? 'ghost' : 'green'} onPress={() => toggleStatus(item.id)} />
        </Card>
      ))}
      <ModalSheet visible={showAdd} title="智能生成处方" subtitle="生成结果仍需医生或康复师确认" onClose={() => setShowAdd(false)}>
        <Text style={styles.inputLabel}>患者</Text>
        <View style={styles.chipRow}>{patients.map((patient) => <Chip key={patient.id} label={patient.name} active={form.patient === patient.name} onPress={() => setForm((p) => ({ ...p, patient: patient.name }))} />)}</View>
        <Text style={styles.inputLabel}>训练重点</Text>
        <View style={styles.chipRow}>{['抓握稳定性', '手指分离', '腕部活动度', '精细动作'].map((item) => <Chip key={item} label={item} active={form.focus === item} onPress={() => setForm((p) => ({ ...p, focus: item }))} />)}</View>
        <Text style={styles.inputLabel}>训练强度</Text>
        <View style={styles.chipRow}>{['轻柔', '中等', '进阶'].map((item) => <Chip key={item} label={item} active={form.intensity === item} onPress={() => setForm((p) => ({ ...p, intensity: item }))} color={item === '进阶' ? C.yellow : C.primary} />)}</View>
        <InputField label="单次时长（分钟）" icon="timer-outline" value={form.duration} onChangeText={(v) => setForm((p) => ({ ...p, duration: v }))} keyboardType="numeric" placeholder="15" />
        <PrimaryButton label="生成处方" icon="sparkles-outline" onPress={addPrescription} />
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

  const start = () => {
    setLeft(duration);
    setScore(0);
    setGrip(0);
    setCombo(0);
    setRunning(true);
  };
  const tapGrip = () => {
    if (!running) {
      Alert.alert('提示', '请先点击开始训练');
      return;
    }
    const gain = Math.floor(5 + Math.random() * 9);
    setGrip(clamp(35 + gain * 6 + combo * 2, 0, 100));
    setCombo((prev) => prev + 1);
    setScore((prev) => clamp(prev + gain, 0, 120));
  };

  return (
    <>
      <SectionHeader title="互动抓握训练" subtitle="点击训练区模拟握力采集，结束后自动生成训练记录" />
      <Card style={styles.gameCard}>
        <View style={styles.gameTop}><View><Text style={styles.gamePatient}>{patient}</Text><Text style={styles.itemMeta}>本轮剩余 {left}s · 已记录 {records.length} 条</Text></View><View style={styles.scoreBox}><Text style={styles.scoreBoxValue}>{score}</Text><Text style={styles.scoreBoxLabel}>分</Text></View></View>
        <Text style={styles.inputLabel}>训练患者</Text>
        <View style={styles.chipRow}>{patients.map((item) => <Chip key={item.id} label={item.name} active={patient === item.name} onPress={() => setPatient(item.name)} />)}</View>
        <Text style={styles.inputLabel}>训练时长</Text>
        <View style={styles.chipRow}>{[30, 60, 90].map((item) => <Chip key={item} label={item + 's'} active={duration === item} onPress={() => { setDuration(item); setLeft(item); }} />)}</View>
        <TouchableOpacity style={styles.gripPad} activeOpacity={0.9} onPress={tapGrip}>
          <Ionicons name="hand-left-outline" size={50} color="#FFFFFF" />
          <Text style={styles.gripPadTitle}>{running ? '连续点击模拟握力' : '点击开始后进行训练'}</Text>
          <Text style={styles.gripPadSub}>当前握力强度 {grip}% · 连击 {combo}</Text>
          <ProgressBar value={grip} color="#FFFFFF" height={8} />
        </TouchableOpacity>
        <View style={styles.gameStats}><MiniStat label="最佳成绩" value={best + '分'} /><MiniStat label="完成度" value={clamp(Math.round((duration - left) / duration * 100), 0, 100) + '%'} /><MiniStat label="节奏" value={combo > 8 ? '稳定' : '热身'} /></View>
        <View style={styles.actionRow}><PrimaryButton label="开始" icon="play-outline" tone="green" onPress={start} style={styles.flex} /><PrimaryButton label="暂停" icon="pause-outline" tone="ghost" onPress={() => setRunning(false)} style={styles.flex} /></View>
      </Card>
    </>
  );
}

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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}><View><Text style={styles.pageTitle}>数据中心</Text><Text style={styles.pageSubtitle}>训练记录、康复报告与趋势分析</Text></View></View>
      <SegmentedControl items={tabItems} value={subTab} onChange={setSubTab} />
      {subTab === 'records' && <RecordsPanel records={records} onAdd={() => setShowRecord(true)} />}
      {subTab === 'reports' && <ReportsPanel reports={reports} onAdd={() => setShowReport(true)} onView={setViewReport} />}
      {subTab === 'analytics' && <AnalyticsPanel records={records} reports={reports} />}
      {subTab === 'storage' && <StoragePanel storage={storage} />}
      <ModalSheet visible={showRecord} title="新增训练记录" subtitle="手动补录线下训练数据" onClose={() => setShowRecord(false)}>
        <InputField label="患者" icon="person-outline" value={recordForm.patient} onChangeText={(v) => setRecordForm((p) => ({ ...p, patient: v }))} placeholder="患者姓名" />
        <InputField label="训练类型" icon="fitness-outline" value={recordForm.type} onChangeText={(v) => setRecordForm((p) => ({ ...p, type: v }))} placeholder="例如：抓握训练" />
        <InputField label="训练时长" icon="timer-outline" value={recordForm.duration} onChangeText={(v) => setRecordForm((p) => ({ ...p, duration: v }))} keyboardType="numeric" placeholder="分钟" />
        <InputField label="训练得分" icon="analytics-outline" value={recordForm.score} onChangeText={(v) => setRecordForm((p) => ({ ...p, score: v }))} keyboardType="numeric" placeholder="0-100" />
        <PrimaryButton label="保存记录" icon="save-outline" onPress={addRecord} />
      </ModalSheet>
      <ModalSheet visible={showReport} title="生成康复报告" subtitle="根据现有记录快速生成阶段总结" onClose={() => setShowReport(false)}>
        <InputField label="患者" icon="person-outline" value={reportForm.patient} onChangeText={(v) => setReportForm((p) => ({ ...p, patient: v }))} placeholder="患者姓名" />
        <InputField label="报告标题" icon="document-text-outline" value={reportForm.title} onChangeText={(v) => setReportForm((p) => ({ ...p, title: v }))} placeholder="例如：第4周康复报告" />
        <InputField label="摘要" icon="create-outline" value={reportForm.summary} onChangeText={(v) => setReportForm((p) => ({ ...p, summary: v }))} placeholder="可留空自动生成" />
        <PrimaryButton label="生成报告" icon="sparkles-outline" onPress={addReport} />
      </ModalSheet>
      <ModalSheet visible={!!viewReport} title="报告详情" subtitle={viewReport ? viewReport.date : ''} onClose={() => setViewReport(null)}>
        {!!viewReport && <View><Text style={styles.modalReportTitle}>{viewReport.title}</Text><InfoCell label="患者" value={viewReport.patient} /><InfoCell label="状态" value={viewReport.status} /><Text style={styles.detailParagraph}>{viewReport.summary}</Text><PrimaryButton label="关闭" icon="checkmark-outline" onPress={() => setViewReport(null)} /></View>}
      </ModalSheet>
    </ScrollView>
  );
}

function RecordsPanel({ records, onAdd }) {
  return (
    <>
      <SectionHeader title="训练记录" action="新增" onAction={onAdd} />
      {records.map((item) => (
        <Card key={item.id} style={styles.recordCard}>
          <View style={styles.cardTopLine}><View><Text style={styles.itemTitle}>{item.patient}</Text><Text style={styles.itemMeta}>{item.type} · {item.date}</Text></View><Text style={styles.recordScore}>{item.score}分</Text></View>
          <View style={styles.recordBottom}><Text style={styles.recordMeta}>训练 {item.duration} 分钟</Text><View style={styles.flex}><ProgressBar value={item.completion} color={C.green} /></View><Text style={styles.recordMeta}>{item.completion}%</Text></View>
        </Card>
      ))}
    </>
  );
}

function ReportsPanel({ reports, onAdd, onView }) {
  return (
    <>
      <SectionHeader title="康复报告" action="生成" onAction={onAdd} />
      {reports.map((item) => (
        <Card key={item.id} style={styles.reportCard}>
          <View style={styles.cardTopLine}><View style={styles.flex}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.itemMeta}>{item.patient} · {item.date}</Text></View><View style={styles.statusBadge}><Text style={styles.statusText}>{item.status}</Text></View></View>
          <Text style={styles.noteText}>{item.summary}</Text>
          <View style={styles.actionRow}><PrimaryButton label="查看" icon="eye-outline" tone="ghost" onPress={() => onView(item)} style={styles.flex} /><PrimaryButton label="导出" icon="download-outline" tone="primary" onPress={() => Alert.alert('导出准备中', '正式上架前可接入 PDF 导出或云端报告。')} style={styles.flex} /></View>
        </Card>
      ))}
    </>
  );
}

function AnalyticsPanel({ records, reports }) {
  const avgScore = Math.round(records.reduce((sum, item) => sum + item.score, 0) / records.length);
  const avgCompletion = Math.round(records.reduce((sum, item) => sum + item.completion, 0) / records.length);
  const totalMinutes = records.reduce((sum, item) => sum + item.duration, 0);
  const chart = records.slice(0, 5).reverse();
  return (
    <>
      <SectionHeader title="趋势分析" subtitle="根据当前训练记录实时汇总" />
      <View style={styles.metricGrid}>
        <MetricCard icon="speedometer-outline" label="平均分" value={String(avgScore)} caption="训练表现" color={C.primary} />
        <MetricCard icon="checkmark-done-outline" label="完成率" value={avgCompletion + '%'} caption="任务完成" color={C.green} />
        <MetricCard icon="time-outline" label="总时长" value={String(totalMinutes)} caption="分钟" color={C.yellow} />
        <MetricCard icon="documents-outline" label="报告" value={String(reports.length)} caption="已生成" color={C.purple} />
      </View>
      <Card style={styles.chartCard}>
        <Text style={styles.itemTitle}>近 5 次训练得分</Text>
        <View style={styles.barChart}>{chart.map((item) => <View key={item.id} style={styles.barItem}><View style={styles.barTrack}><View style={[styles.barFill, { height: item.score + '%' }]} /></View><Text style={styles.barLabel}>{item.patient.slice(0, 1)}</Text></View>)}</View>
      </Card>
    </>
  );
}

function StoragePanel({ storage }) {
  const [filter, setFilter] = useState('全部');
  const list = filter === '全部' ? storage : storage.filter((item) => item.type === filter);
  return (
    <>
      <SectionHeader title="数据仓储" subtitle="原始数据、模板与归档文档" />
      <View style={styles.chipRow}>{['全部', '模板', '数据', '文档'].map((item) => <Chip key={item} label={item} active={filter === item} onPress={() => setFilter(item)} />)}</View>
      {list.map((item) => <Card key={item.id} style={styles.storageCard}><IconBubble icon={item.type === '数据' ? 'server-outline' : item.type === '模板' ? 'copy-outline' : 'document-outline'} color={item.type === '数据' ? C.blue : item.type === '模板' ? C.purple : C.primary} bg="#F1F5F9" /><View style={styles.flex}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.itemMeta}>{item.type} · {item.owner} · {item.updated}</Text></View><Text style={styles.storageSize}>{item.size}</Text></Card>)}
    </>
  );
}

function ProfileScreen({ user, setUser, onLogout, onDeleteAccount, onUpdateUser, offlineMode }) {
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
    } catch (error) {
      Alert.alert('\u4fdd\u5b58\u5931\u8d25', error.message || '\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002');
    }
  };
  const confirmDeleteAccount = () => {
    Alert.alert('\u786e\u8ba4\u6ce8\u9500\u8d26\u53f7', '\u6b64\u64cd\u4f5c\u4f1a\u6c38\u4e45\u5220\u9664\u5f53\u524d\u8d26\u53f7\u548c\u4e91\u7aef\u4fdd\u5b58\u7684\u60a3\u8005\u6863\u6848\u3001\u8bad\u7ec3\u8bb0\u5f55\u3001\u62a5\u544a\u3001\u8bbe\u5907\u6570\u636e\u3002\u5220\u9664\u540e\u65e0\u6cd5\u6062\u590d\u3002', [
      { text: '\u53d6\u6d88', style: 'cancel' },
      { text: '\u786e\u8ba4\u5220\u9664', style: 'destructive', onPress: onDeleteAccount },
    ]);
  };
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHero}><View style={styles.profileHeroAvatar}><Ionicons name="person" size={42} color={C.primary} /></View><Text style={styles.profileHeroName}>{user.name}</Text><Text style={styles.profileHeroRole}>{user.role} · 健康守护者</Text></View>
      <SectionHeader title="账号服务" />
      <Card><ProfileMenu icon="person-circle-outline" title="个人资料" caption="姓名、身份与联系方式" onPress={() => setShowEdit(true)} /><ProfileMenu icon="lock-closed-outline" title="密码与安全" caption="建议正式上线前接入短信验证" onPress={() => Alert.alert('安全中心', '演示版暂未接入真实短信服务。')} /><ProfileMenu icon="cloud-upload-outline" title="数据保存" caption={offlineMode ? '当前保存在本机离线演示数据中' : '云端演示备份已开启'} onPress={() => Alert.alert('数据保存', offlineMode ? '当前为离线演示模式，数据保存在本机。' : '当前账号数据会同步到轻量后端，适合比赛演示。')} last /></Card>
      <SectionHeader title="系统设置" />
      <Card><SettingRow label="康复提醒通知" value={settings.notification} onValueChange={(v) => setSettings((p) => ({ ...p, notification: v }))} /><SettingRow label="训练数据自动同步" value={settings.cloud} onValueChange={(v) => setSettings((p) => ({ ...p, cloud: v }))} /><SettingRow label="隐私保护模式" value={settings.privacy} onValueChange={(v) => setSettings((p) => ({ ...p, privacy: v }))} last /></Card>
      <SectionHeader title="合规与更多" />
      <Card>
        <ProfileMenu icon="information-circle-outline" title="关于应用" caption="版本、版权与比赛演示说明" onPress={() => setShowAbout(true)} />
        <ProfileMenu icon="shield-checkmark-outline" title="隐私政策" caption="查看信息收集、保存和删除说明" onPress={() => setShowPrivacy(true)} />
        <ProfileMenu icon="document-text-outline" title="用户协议" caption="查看服务范围和健康提示" onPress={() => setShowAgreement(true)} />
        <ProfileMenu icon="trash-outline" title="注销账号与删除数据" caption="删除当前账号和云端演示数据" onPress={confirmDeleteAccount} danger />
        <ProfileMenu icon="log-out-outline" title="退出登录" caption="返回登录页" onPress={onLogout} danger last />
      </Card>
      <ModalSheet visible={showEdit} title="编辑资料" subtitle="演示版资料会保存在当前运行状态中" onClose={() => setShowEdit(false)}><InputField label="姓名" icon="person-outline" value={draft.name} onChangeText={(v) => setDraft((p) => ({ ...p, name: v }))} placeholder="姓名" /><InputField label="身份" icon="briefcase-outline" value={draft.role} onChangeText={(v) => setDraft((p) => ({ ...p, role: v }))} placeholder="身份" /><PrimaryButton label="保存资料" icon="save-outline" onPress={saveProfile} /></ModalSheet>
      <ModalSheet visible={showAbout} title="关于健康守护者" subtitle="版本 1.0.0" onClose={() => setShowAbout(false)}><View style={styles.aboutMark}><Ionicons name="heart-circle" size={68} color={C.primary} /></View><Text style={styles.detailParagraph}>健康守护者是一款面向手部康复训练场景的移动端应用原型，包含患者档案、设备管理、评估记录、训练处方、互动训练、数据报告、账号体系和数据删除能力。</Text><Text style={styles.detailParagraph}>当前版本定位为比赛演示和评审体验：使用轻量后端保存账号与演示数据，功能闭环完整，部署成本低，不作为真实医疗诊断工具。</Text><PrimaryButton label="我知道了" icon="checkmark-outline" onPress={() => setShowAbout(false)} /></ModalSheet>
      <ModalSheet visible={showPrivacy} title="隐私政策" subtitle="演示版隐私与数据说明" onClose={() => setShowPrivacy(false)}><Text style={styles.detailParagraph}>我们会保存你注册时填写的邮箱、姓名、身份，以及在 App 内创建的患者档案、设备状态、评估记录、训练处方、训练记录、报告和资料条目。</Text><Text style={styles.detailParagraph}>这些数据仅用于账号登录、功能演示、训练管理和报告展示。比赛演示版默认保存在轻量后端文件数据库中，不用于广告画像，不向第三方出售。</Text><Text style={styles.detailParagraph}>你可以在“我的 - 注销账号与删除数据”中删除当前账号及相关演示数据。删除完成后，该账号无法继续登录，关联数据会从后端移除。</Text><PrimaryButton label="关闭" icon="checkmark-outline" onPress={() => setShowPrivacy(false)} /></ModalSheet>
      <ModalSheet visible={showAgreement} title="用户协议" subtitle="服务范围与健康提示" onClose={() => setShowAgreement(false)}><Text style={styles.detailParagraph}>健康守护者提供康复过程记录、设备管理、评估数据录入、训练处方生成、互动训练和阶段报告等功能。</Text><Text style={styles.detailParagraph}>本应用用于比赛演示和康复管理辅助，不提供医疗诊断，不替代医生、康复师或其他专业医疗人员意见，也不用于紧急医疗服务。</Text><Text style={styles.detailParagraph}>用户应确保录入信息真实、合法，并理解演示版数据容量有限，不适合存放真实敏感医疗档案。</Text><PrimaryButton label="同意并关闭" icon="checkmark-outline" onPress={() => setShowAgreement(false)} /></ModalSheet>
    </ScrollView>
  );
}

function ProfileMenu({ icon, title, caption, onPress, last, danger }) {
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={[styles.profileMenu, !last && styles.rowDivider]}>
      <Ionicons name={icon} size={22} color={danger ? C.red : C.primary} style={styles.profileMenuIcon} />
      <View style={styles.flex}><Text style={[styles.profileMenuTitle, danger && { color: C.red }]}>{title}</Text><Text style={styles.profileMenuCaption}>{caption}</Text></View>
      <Ionicons name="chevron-forward" size={18} color="#A3ADBA" />
    </TouchableOpacity>
  );
}

function SettingRow({ label, value, onValueChange, last }) {
  return (
    <View style={[styles.settingRow, !last && styles.rowDivider]}>
      <Text style={styles.profileMenuTitle}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#D4DDE7', true: '#BFE7E5' }} thumbColor={value ? C.primary : '#FFFFFF'} />
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
      ? { title: '快捷生成处方', subtitle: '生成一条待确认训练处方', label: '单次时长（分钟）', placeholder: '15', button: '生成处方', icon: 'medical-outline' }
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
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <TouchableOpacity key={tab.key} style={styles.tabItem} activeOpacity={0.84} onPress={() => onChange(tab.key)}>
            <Ionicons name={active ? tab.activeIcon : tab.icon} size={22} color={active ? C.primary : '#8793A3'} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

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

  const resetLocalData = () => {
    applyAppData(defaultAppData());
    setActiveTab('workbench');
    setFlow(null);
  };

  const readOfflineSession = async () => {
    const savedUser = await AsyncStorage.getItem(OFFLINE_USER_KEY);
    const savedData = await AsyncStorage.getItem(OFFLINE_DATA_KEY);
    return {
      token: OFFLINE_TOKEN,
      user: savedUser ? JSON.parse(savedUser) : DEFAULT_OFFLINE_USER,
      appData: savedData ? JSON.parse(savedData) : defaultAppData(),
    };
  };

  useEffect(() => {
    let alive = true;
    const bootstrap = async () => {
      try {
        const savedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (savedToken) {
          if (savedToken === OFFLINE_TOKEN) {
            const offline = await readOfflineSession();
            if (!alive) return;
            applyAppData(offline.appData);
            setToken(offline.token);
            setUser(offline.user);
            setCloudReady(false);
            return;
          }
          const [me, data] = await Promise.all([
            apiRequest('/api/me', { token: savedToken }),
            apiRequest('/api/app-data', { token: savedToken }),
          ]);
          if (!alive) return;
          applyAppData(data.appData);
          setToken(savedToken);
          setUser(me.user);
          setCloudReady(true);
        }
      } catch (error) {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        if (alive) {
          setToken(null);
          setUser(null);
          setCloudReady(false);
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    bootstrap();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!token || !user) return undefined;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      const appData = { patients, devices, assessments, prescriptions, records, reports, storage, tasks };
      if (token === OFFLINE_TOKEN) {
        AsyncStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(appData)).catch((error) => {
          console.warn('Local save failed', error.message);
        });
        return;
      }
      if (!cloudReady) return;
      apiRequest('/api/app-data', {
        method: 'PUT',
        token,
        body: { appData },
      }).catch((error) => {
        console.warn('Sync failed', error.message);
      });
    }, 900);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [token, user, cloudReady, patients, devices, assessments, prescriptions, records, reports, storage, tasks]);

  const handleAuthenticated = (data, options = {}) => {
    applyAppData(data.appData);
    setToken(data.token);
    setUser(data.user);
    setCloudReady(!options.offline);
  };

  const handleOfflineDemo = async () => {
    const offline = await readOfflineSession();
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, OFFLINE_TOKEN);
    await AsyncStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(offline.user));
    await AsyncStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(offline.appData));
    handleAuthenticated(offline, { offline: true });
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
    setCloudReady(false);
    resetLocalData();
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    try {
      if (token === OFFLINE_TOKEN) {
        await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, OFFLINE_USER_KEY, OFFLINE_DATA_KEY]);
        setToken(null);
        setUser(null);
        setCloudReady(false);
        resetLocalData();
        Alert.alert('本地演示账号已删除', '本机保存的离线演示数据已清除。');
        return;
      }
      await apiRequest('/api/account', { method: 'DELETE', token });
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      setToken(null);
      setUser(null);
      setCloudReady(false);
      resetLocalData();
      Alert.alert('账号已注销', '账号和云端演示数据已删除。');
    } catch (error) {
      Alert.alert('注销失败', error.message || '请稍后重试。');
    }
  };

  const handleUpdateUser = async (nextUser) => {
    if (!token) return;
    if (token === OFFLINE_TOKEN) {
      const updated = { ...user, name: nextUser.name, role: nextUser.role };
      await AsyncStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(updated));
      setUser(updated);
      return;
    }
    const data = await apiRequest('/api/me', {
      method: 'PATCH',
      token,
      body: { name: nextUser.name, role: nextUser.role },
    });
    setUser(data.user);
  };

  const addAssessment = (item) => setAssessments((prev) => [item, ...prev]);
  const addPrescription = (item) => setPrescriptions((prev) => [item, ...prev]);
  const addReport = (item) => setReports((prev) => [item, ...prev]);

  if (loading) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <View style={styles.splashMark}><Ionicons name="heart-circle" size={70} color="#FFFFFF" /></View>
        <Text style={styles.splashTitle}>健康守护者</Text>
        <Text style={styles.splashSubtitle}>正在连接演示服务</Text>
      </View>
    );
  }
  if (!user) return <LoginScreen onLogin={handleAuthenticated} onOfflineDemo={handleOfflineDemo} />;

  const renderScreen = () => {
    if (activeTab === 'device') return <DeviceScreen devices={devices} setDevices={setDevices} />;
    if (activeTab === 'training') return <TrainingScreen patients={patients} setPatients={setPatients} assessments={assessments} setAssessments={setAssessments} prescriptions={prescriptions} setPrescriptions={setPrescriptions} records={records} setRecords={setRecords} />;
    if (activeTab === 'data') return <DataScreen records={records} setRecords={setRecords} reports={reports} setReports={setReports} storage={storage} />;
    if (activeTab === 'profile') return <ProfileScreen user={user} setUser={setUser} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} onUpdateUser={handleUpdateUser} offlineMode={token === OFFLINE_TOKEN} />;
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  appRoot: { flex: 1, backgroundColor: C.bg },
  appBody: { flex: 1, backgroundColor: C.bg },
  screen: { flex: 1, backgroundColor: C.bg },
  screenContent: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 104 },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primary },
  splashMark: { width: 104, height: 104, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)', marginBottom: 18 },
  splashTitle: { fontSize: 28, color: '#FFFFFF', fontWeight: '800', letterSpacing: 0 },
  splashSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.76)', marginTop: 8 },
  loginPage: { flex: 1, backgroundColor: C.bg },
  loginContent: { padding: 22, paddingBottom: 36, minHeight: '100%', justifyContent: 'center' },
  loginBrand: { alignItems: 'center', marginBottom: 24 },
  brandMark: { width: 86, height: 86, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primary, marginBottom: 14 },
  loginTitle: { fontSize: 30, fontWeight: '900', color: C.text, letterSpacing: 0 },
  loginSubtitle: { fontSize: 14, color: C.muted, marginTop: 8, textAlign: 'center' },
  loginCard: { padding: 18 },
  loginSwitch: { flexDirection: 'row', padding: 4, backgroundColor: '#F0F4F8', borderRadius: 14, marginBottom: 18 },
  loginSwitchItem: { flex: 1, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  loginSwitchActive: { backgroundColor: C.surface },
  loginSwitchText: { color: C.muted, fontSize: 15, fontWeight: '700' },
  loginSwitchTextActive: { color: C.primary },
  loginSubmit: { marginTop: 12 },
  offlineButton: { marginTop: 12 },
  demoAccount: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  demoText: { marginLeft: 6, color: C.muted, fontSize: 12 },
  serverHint: { color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 8 },
  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerKicker: { color: C.muted, fontSize: 13, marginBottom: 4 },
  headerTitle: { color: C.text, fontSize: 24, fontWeight: '900', letterSpacing: 0 },
  noticeButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  noticeDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: C.red },
  heroPanel: { borderRadius: 22, padding: 18, backgroundColor: C.navy, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  heroText: { flex: 1, paddingRight: 10 },
  heroKicker: { color: '#A9D8D8', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  heroTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', lineHeight: 29 },
  heroSubtitle: { color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 20, marginTop: 8 },
  heroIcon: { width: 70, height: 70, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.surface, borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#EDF1F5', shadowColor: '#0B1726', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, elevation: 3 },
  iconBubble: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 10 },
  sectionTextWrap: { flex: 1, paddingRight: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: C.text, letterSpacing: 0 },
  sectionSubtitle: { fontSize: 12, color: C.muted, marginTop: 3 },
  textAction: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8 },
  textActionLabel: { color: C.primary, fontSize: 13, fontWeight: '800' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  metricCard: { width: (width - 48) / 2, marginBottom: 12, padding: 14 },
  metricValue: { fontSize: 25, color: C.text, fontWeight: '900', marginTop: 12 },
  metricLabel: { fontSize: 13, color: C.text, fontWeight: '700', marginTop: 2 },
  metricCaption: { fontSize: 12, color: C.muted, marginTop: 3 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  quickCard: { width: (width - 48) / 2, backgroundColor: C.surface, borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#EDF1F5' },
  quickTitle: { fontSize: 16, fontWeight: '900', color: C.text, marginTop: 12 },
  quickCaption: { fontSize: 12, color: C.muted, lineHeight: 18, marginTop: 4 },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#EDF1F5' },
  taskCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  taskCheckDone: { backgroundColor: C.primary, borderColor: C.primary },
  taskTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  taskMeta: { fontSize: 12, color: C.muted, marginTop: 3 },
  doneText: { textDecorationLine: 'line-through', color: C.muted },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  priorityText: { fontSize: 12, fontWeight: '900' },
  patientSummary: { flexDirection: 'row', alignItems: 'center' },
  patientAvatar: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.soft, marginRight: 12 },
  patientName: { fontSize: 16, fontWeight: '900', color: C.text },
  patientMeta: { fontSize: 12, color: C.muted, marginTop: 4 },
  patientNext: { fontSize: 12, color: C.primary, marginTop: 5, fontWeight: '700' },
  riskBadge: { backgroundColor: '#E9F8F0', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  riskBadgeWarn: { backgroundColor: '#FFF3D8' },
  riskText: { color: C.green, fontWeight: '900', fontSize: 12 },
  riskTextWarn: { color: C.yellow },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  pageTitle: { fontSize: 25, fontWeight: '900', color: C.text, letterSpacing: 0 },
  pageSubtitle: { fontSize: 13, color: C.muted, marginTop: 5 },
  roundAdd: { width: 46, height: 46, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  deviceSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deviceSummaryItem: { flex: 1, alignItems: 'center' },
  deviceSummaryDivider: { width: 1, height: 42, backgroundColor: C.line },
  bigNumber: { fontSize: 22, fontWeight: '900', color: C.text },
  smallLabel: { fontSize: 12, color: C.muted, marginTop: 4 },
  deviceCard: { padding: 15 },
  deviceTop: { flexDirection: 'row', alignItems: 'center' },
  deviceName: { fontSize: 16, fontWeight: '900', color: C.text },
  deviceType: { fontSize: 12, color: C.muted, marginTop: 4 },
  onlineBadge: { backgroundColor: '#E9F8F0', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  offlineBadge: { backgroundColor: '#F1F3F5' },
  onlineText: { color: C.green, fontSize: 12, fontWeight: '900' },
  offlineText: { color: C.muted },
  deviceMetrics: { flexDirection: 'row', marginTop: 16 },
  deviceMetric: { flex: 1, marginRight: 12 },
  deviceMetricLabel: { fontSize: 12, color: C.muted },
  deviceMetricValue: { fontSize: 18, fontWeight: '900', color: C.text, marginVertical: 5 },
  progressTrack: { width: '100%', borderRadius: 999, backgroundColor: '#E9EEF4', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  cardActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  syncText: { fontSize: 12, color: C.muted, flex: 1 },
  inlineButtons: { flexDirection: 'row', alignItems: 'center' },
  smallAction: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, backgroundColor: '#F3F8F8', paddingHorizontal: 10, paddingVertical: 7, marginLeft: 8 },
  smallActionFilled: { backgroundColor: C.primary },
  smallActionText: { color: C.primary, fontSize: 12, fontWeight: '900', marginLeft: 4 },
  smallActionTextFilled: { color: '#FFFFFF' },
  segmentWrap: { paddingVertical: 2, paddingRight: 12, marginBottom: 14 },
  segmentItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, height: 40, borderRadius: 999, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, marginRight: 8 },
  segmentItemActive: { backgroundColor: C.primary, borderColor: C.primary },
  segmentText: { marginLeft: 6, fontSize: 13, color: C.muted, fontWeight: '800' },
  segmentTextActive: { color: '#FFFFFF' },
  profileCard: { padding: 15 },
  profileTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  patientAvatarLarge: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.soft, marginRight: 12 },
  profileName: { fontSize: 18, fontWeight: '900', color: C.text },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  infoCell: { width: '48%', backgroundColor: '#F7FAFC', borderRadius: 14, padding: 12, marginBottom: 10 },
  infoLabel: { color: C.muted, fontSize: 12, marginBottom: 5 },
  infoValue: { color: C.text, fontSize: 13, fontWeight: '800' },
  inputGroup: { marginBottom: 13 },
  inputLabel: { color: C.text, fontSize: 13, fontWeight: '900', marginBottom: 8, marginTop: 2 },
  inputBox: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: '#F8FAFC', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: C.text, fontSize: 15, paddingVertical: 11 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 13 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 13, color: C.muted, fontWeight: '800' },
  primaryButton: { minHeight: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 16, marginHorizontal: 4 },
  buttonIcon: { marginRight: 7 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  ghostButtonText: { color: C.text },
  cardTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  itemTitle: { color: C.text, fontSize: 16, fontWeight: '900', lineHeight: 22 },
  itemMeta: { color: C.muted, fontSize: 12, marginTop: 4 },
  assessmentCard: { padding: 15 },
  scoreCircle: { width: 54, height: 54, borderRadius: 18, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  scoreText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  assessmentMetrics: { flexDirection: 'row', justifyContent: 'space-between' },
  miniStat: { alignItems: 'center', flex: 1, paddingVertical: 8 },
  miniStatValue: { color: C.text, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  miniStatLabel: { color: C.muted, fontSize: 11, marginTop: 4, textAlign: 'center' },
  noteText: { color: C.muted, fontSize: 13, lineHeight: 20, marginTop: 8 },
  prescriptionCard: { padding: 15 },
  statusBadge: { borderRadius: 999, backgroundColor: '#E9F8F0', paddingHorizontal: 10, paddingVertical: 6 },
  statusBadgeSoft: { backgroundColor: '#FFF3D8' },
  statusText: { color: C.green, fontSize: 12, fontWeight: '900' },
  statusTextSoft: { color: C.yellow },
  rxGrid: { flexDirection: 'row', marginBottom: 12 },
  gameCard: { padding: 16 },
  gameTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  gamePatient: { fontSize: 19, color: C.text, fontWeight: '900' },
  scoreBox: { minWidth: 70, borderRadius: 18, padding: 10, backgroundColor: '#F0F8F8', alignItems: 'center' },
  scoreBoxValue: { color: C.primary, fontSize: 24, fontWeight: '900' },
  scoreBoxLabel: { color: C.muted, fontSize: 11 },
  gripPad: { backgroundColor: C.primary, borderRadius: 22, padding: 22, alignItems: 'center', marginTop: 6, marginBottom: 12 },
  gripPadTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 8 },
  gripPadSub: { color: 'rgba(255,255,255,0.76)', fontSize: 13, marginTop: 5, marginBottom: 14 },
  gameStats: { flexDirection: 'row', backgroundColor: '#F7FAFC', borderRadius: 16, marginBottom: 12 },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  recordCard: { padding: 15 },
  recordScore: { color: C.primary, fontSize: 20, fontWeight: '900' },
  recordBottom: { flexDirection: 'row', alignItems: 'center' },
  recordMeta: { color: C.muted, fontSize: 12, marginHorizontal: 8 },
  reportCard: { padding: 15 },
  chartCard: { padding: 16 },
  barChart: { height: 190, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', marginTop: 18 },
  barItem: { alignItems: 'center', flex: 1 },
  barTrack: { width: 26, height: 150, borderRadius: 999, backgroundColor: '#EDF2F7', overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 999, backgroundColor: C.primary },
  barLabel: { marginTop: 8, color: C.muted, fontSize: 12, fontWeight: '800' },
  storageCard: { flexDirection: 'row', alignItems: 'center' },
  storageSize: { color: C.muted, fontSize: 12, fontWeight: '800' },
  profileHero: { backgroundColor: C.navy, borderRadius: 24, alignItems: 'center', paddingVertical: 26, marginBottom: 18 },
  profileHeroAvatar: { width: 86, height: 86, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  profileHeroName: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  profileHeroRole: { color: 'rgba(255,255,255,0.74)', fontSize: 13, marginTop: 5 },
  profileMenu: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  profileMenuIcon: { marginRight: 12 },
  profileMenuTitle: { color: C.text, fontSize: 15, fontWeight: '900' },
  profileMenuCaption: { color: C.muted, fontSize: 12, marginTop: 3 },
  settingRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aboutMark: { alignItems: 'center', marginVertical: 10 },
  detailParagraph: { color: C.muted, fontSize: 14, lineHeight: 23, marginBottom: 14 },
  modalShade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,27,42,0.38)' },
  modalSheet: { maxHeight: '88%', backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingBottom: 22 },
  modalHandle: { alignSelf: 'center', width: 42, height: 5, borderRadius: 999, backgroundColor: '#D5DDE6', marginTop: 10, marginBottom: 14 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  modalTitle: { color: C.text, fontSize: 20, fontWeight: '900' },
  modalSubtitle: { color: C.muted, fontSize: 12, marginTop: 4 },
  modalClose: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F4F8' },
  modalReportTitle: { color: C.text, fontSize: 18, fontWeight: '900', marginBottom: 12 },
  tabBar: { position: 'absolute', left: 14, right: 14, bottom: Platform.OS === 'ios' ? 20 : 14, minHeight: 68, borderRadius: 24, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderWidth: 1, borderColor: '#E7EDF3', shadowColor: '#0B1726', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 12 }, shadowRadius: 24, elevation: 10, paddingHorizontal: 6 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  tabLabel: { color: '#8793A3', fontSize: 11, fontWeight: '800', marginTop: 4 },
  tabLabelActive: { color: C.primary },
});
