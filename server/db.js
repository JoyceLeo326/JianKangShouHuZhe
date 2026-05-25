const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'db.json');

const initialAppData = {
  patients: [
    { id: 'p1', name: '李明', age: '62', diagnosis: '脑卒中恢复期', side: '右手', stage: '第4周', risk: '低风险', next: '今天 15:00', phone: '13800000001' },
    { id: 'p2', name: '王阿姨', age: '68', diagnosis: '腕关节术后', side: '左手', stage: '第2周', risk: '中风险', next: '明天 10:30', phone: '13800000002' }
  ],
  devices: [
    { id: 'd1', name: '智能握力手套 A01', type: '康复手套', status: 'online', battery: 82, signal: 94, patient: '李明', lastSync: '3分钟前' },
    { id: 'd2', name: '腕部活动度传感器 B12', type: '角度传感器', status: 'online', battery: 57, signal: 76, patient: '王阿姨', lastSync: '18分钟前' },
  { id: 'd3', name: '肌张力采集器 C07', type: '肌电设备', status: 'standby', battery: 21, signal: 18, patient: '未绑定', lastSync: '昨天 19:20' }
  ],
  assessments: [
    { id: 'a1', patient: '李明', date: '2026-04-26', grip: 22, rom: 66, pain: 2, adl: 72, score: 78, note: '握力提升，建议继续低阻力主动训练。' },
    { id: 'a2', patient: '王阿姨', date: '2026-04-25', grip: 15, rom: 48, pain: 4, adl: 58, score: 64, note: '腕部活动度仍受限，需增加热身与被动活动。' }
  ],
  prescriptions: [
    { id: 'rx1', patient: '李明', title: '手指分离控制训练', intensity: '中等', frequency: '每日 2 次', duration: '15 分钟', status: '执行中', focus: '精细动作、抓握稳定性' },
    { id: 'rx2', patient: '王阿姨', title: '腕关节活动度恢复', intensity: '轻柔', frequency: '每日 3 次', duration: '10 分钟', status: '待确认', focus: '屈伸活动度、疼痛控制' }
  ],
  records: [
    { id: 'r1', patient: '李明', type: '抓握训练', date: '2026-04-26', duration: 18, completion: 92, score: 86 },
    { id: 'r2', patient: '王阿姨', type: '腕部活动', date: '2026-04-25', duration: 12, completion: 78, score: 73 },
    { id: 'r3', patient: '李明', type: '精细动作', date: '2026-04-24', duration: 15, completion: 88, score: 81 }
  ],
  reports: [
    { id: 'rp1', patient: '李明', title: '第4周康复进展报告', date: '2026-04-26', status: '已生成', summary: '本周握力与完成率均有提升，建议维持当前强度并增加手指分离任务。' },
    { id: 'rp2', patient: '王阿姨', title: '术后活动度评估报告', date: '2026-04-25', status: '待复核', summary: '疼痛评分下降，腕部活动度恢复偏慢，建议延长热敷和低角度主动训练。' }
  ],
  storage: [
    { id: 's1', title: '评估量表模板', type: '模板', owner: '系统', updated: '2026-04-21', size: '124 KB' },
    { id: 's2', title: '李明-训练曲线原始数据', type: '数据', owner: '张医生', updated: '2026-04-26', size: '2.1 MB' },
    { id: 's3', title: '患者知情同意书', type: '文档', owner: '管理员', updated: '2026-04-18', size: '430 KB' }
  ],
  tasks: [
    { id: 't1', title: '李明 15:00 复评', meta: '握力 + ROM', priority: '高', done: false },
    { id: 't2', title: '王阿姨处方复核', meta: '术后第2周', priority: '中', done: false },
    { id: 't3', title: '同步手套 A01 数据', meta: '设备中心', priority: '低', done: true }
  ]
};

function ensureDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const now = new Date().toISOString();
    const initialUser = {
      id: 'primary_user',
      email: 'doctor@jiankang.app',
      name: '张医生',
      role: '康复师',
      passwordHash: bcrypt.hashSync('Password2026', 10),
      createdAt: now,
      updatedAt: now
    };
    writeDb({
      users: [initialUser],
      appData: {
        primary_user: { ...initialAppData, updatedAt: now }
      },
      deletionRequests: []
    });
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_PATH);
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

module.exports = {
  initialAppData,
  readDb,
  writeDb,
  publicUser
};
