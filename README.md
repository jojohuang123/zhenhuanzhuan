# 甄嬛传人物相似度检测

**"臣妾做不到像TA，但AI可以帮你分析"**

一个基于 AI 的甄嬛传人物相似度检测应用，上传照片即可分析你长得像剧中的哪位角色！

## 功能特点

- 支持批量上传照片（最多 5 张）
- 宫廷风 UI 设计
- 搞笑评语 + 正经分析双模式
- 进度条动画效果
- 响应式设计，支持移动端

## 技术栈

- **前端**: 纯 HTML/CSS/JavaScript
- **后端**: Vercel Serverless Functions
- **AI 服务**: 豆包大模型 Doubao Seed

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，并填入你的豆包 API Key：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
DOUBAO_API_KEY=你的API Key
```

### 3. 本地开发

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 部署到 Vercel

```bash
# 登录 Vercel
npx vercel login

# 部署
npx vercel

# 或通过 GitHub 集成自动部署
```

### 5. Vercel 环境变量配置

在 [Vercel Dashboard](https://vercel.com/dashboard) 中：
1. 进入你的项目
2. Settings → Environment Variables
3. 添加 `DOUBAO_API_KEY` 环境变量

## 豆包 API Key 获取

1. 访问[火山引擎](https://www.volcengine.com/)
2. 注册/登录账号
3. 创建应用，获取 API Key
4. 确保已开通 Doubao Seed 模型调用权限

## 项目结构

```
├── api/
│   └── analyze.js      # Serverless Function（代理豆包 API）
├── public/
│   ├── index.html      # 主页面
│   ├── style.css       # 宫廷风样式
│   └── script.js       # 前端逻辑
├── data/
│   └── characters.json # 甄嬛传角色数据
├── images/             # 角色头像图片
├── package.json
├── vercel.json
└── .env.example
```

## 角色数据库

支持分析的甄嬛传角色：
- 甄嬛、华妃、皇后、沈眉庄、安陵容
- 果郡王、皇上、苏培盛、温实初、槿汐
- 流朱、浣碧、玉娆、温太医、淳儿、祺贵人

## 注意事项

1. API Key 不要暴露在前端代码中
2. 建议设置 API 调用频率限制
3. 图片大小限制：单张最大 10MB
4. 最多同时分析 5 张图片

## License

MIT
