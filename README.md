# 健康守护者

面向手部康复记录、训练安全、阶段报告和人工复核的跨端工作台。

[在线使用](https://joyceleo326.github.io/JianKangShouHuZhe/)

## 主要功能

- 患者、评估、处方草稿、训练记录与设备档案
- 训练前症状自查和卒中警示症状分流
- 报告草稿、来源与缺失项检查、PDF / CSV 导出
- OpenAI-compatible 信息助手，使用严格 JSON Schema、引用白名单和人工采纳记录
- 敏感信息授权版本、角色操作审计、个人数据导出与删除
- 离线写入队列、同步冲突识别和人工解决
- 本机工作区，以及可选的账号和 API 服务

处方始终以草稿和专业人员复核为前提。AI 输出只用于整理已有记录，不提供自动诊断或自动处方。

## 运行

```bash
npm install
npm run web
```

后端 API：

```bash
npm run server
```

## 验证

```bash
npm test
npm run check:syntax
npm run build:pages
```

测试覆盖 AI 输出治理、隐私授权与审计、报告导出、离线队列、冲突合并、账号权限和空数据初始化。

## 参考来源

- [CDC：卒中警示症状与紧急处置](https://www.cdc.gov/stroke/signs-symptoms/index.html)
- [Royal United Hospitals Bath：手部治疗常见问题](https://ruh.nhs.uk/patients/patient_information/HTH028_Hand_Therapy_FAQs.pdf)
- [NICE NG236：卒中康复中的镜像疗法](https://www.nice.org.uk/guidance/ng236/chapter/Recommendations#mirror-therapy-for-the-upper-or-lower-limb)
- [UCLH：伤口护理与就医提示](https://www.uclh.nhs.uk/patients-and-visitors/patient-information-pages/wound-care)

## 技术栈

- Expo / React Native / React Native Web
- Express
- Node.js Test Runner
- GitHub Pages

## 开源协议

MIT
