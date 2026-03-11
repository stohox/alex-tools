const express = require('express');
const multer = require('multer');
const path = require('path');
const iconv = require('iconv-lite');
const fs = require('fs');

const app = express();
const PORT = 3000;

// 中间件
app.use(express.json());
app.use(express.static('public'));

// 文件上传配置
const upload = multer({ dest: 'uploads/' });

// ==================== 工具函数 ====================

// 算命工具 (娱乐性质)
function fortuneTelling(name, birthDate) {
  const hash = (name + birthDate).split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const fortunes = [
    { type: '大吉', desc: '今天运气非常好，适合做任何决定！', luckyColor: '红色', luckyNumber: Math.floor(Math.random() * 99) + 1 },
    { type: '吉', desc: '运气不错，保持积极心态会有好事发生。', luckyColor: '橙色', luckyNumber: Math.floor(Math.random() * 99) + 1 },
    { type: '中吉', desc: '平稳的一天，适合按计划行事。', luckyColor: '黄色', luckyNumber: Math.floor(Math.random() * 99) + 1 },
    { type: '小吉', desc: '有些小惊喜，注意把握机会。', luckyColor: '绿色', luckyNumber: Math.floor(Math.random() * 99) + 1 },
    { type: '平', desc: '普通的一天，保持平常心即可。', luckyColor: '蓝色', luckyNumber: Math.floor(Math.random() * 99) + 1 },
  ];
  return fortunes[hash % fortunes.length];
}

// UUID 生成
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Base64 编解码
function base64Encode(str) {
  return Buffer.from(str).toString('base64');
}

function base64Decode(str) {
  return Buffer.from(str, 'base64').toString('utf8');
}

// URL 编解码
function urlEncode(str) {
  return encodeURIComponent(str);
}

function urlDecode(str) {
  return decodeURIComponent(str);
}

// 汉字转拼音 (简化版)
const pinyinMap = {
  '一': 'yi', '二': 'er', '三': 'san', '四': 'si', '五': 'wu',
  '六': 'liu', '七': 'qi', '八': 'ba', '九': 'jiu', '十': 'shi',
  '大': 'da', '小': 'xiao', '中': 'zhong', '上': 'shang', '下': 'xia',
  '天': 'tian', '地': 'di', '人': 'ren', '心': 'xin', '我': 'wo',
  '你': 'ni', '他': 'ta', '她': 'ta', '它': 'ta', '是': 'shi',
  '有': 'you', '无': 'wu', '好': 'hao', '坏': 'huai', '来': 'lai',
  '去': 'qu', '爱': 'ai', '恨': 'hen', '快': 'kuai', '慢': 'man'
};

function toPinyin(char) {
  return pinyinMap[char] || char;
}

// 哈希计算
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// 颜色转换
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// ==================== API 路由 ====================

// 算命 API
app.post('/api/fortune', (req, res) => {
  const { name, birthDate } = req.body;
  if (!name || !birthDate) {
    return res.json({ error: '请提供姓名和出生日期' });
  }
  const result = fortuneTelling(name, birthDate);
  res.json({
    name,
    birthDate,
    ...result,
    tip: '仅供娱乐，请勿当真！'
  });
});

// UUID 生成
app.get('/api/uuid', (req, res) => {
  const count = parseInt(req.query.count) || 1;
  const uuids = [];
  for (let i = 0; i < count; i++) {
    uuids.push(generateUUID());
  }
  res.json({ uuids });
});

// Base64 编解码
app.post('/api/base64/encode', (req, res) => {
  const { text } = req.body;
  res.json({ result: base64Encode(text) });
});

app.post('/api/base64/decode', (req, res) => {
  const { text } = req.body;
  try {
    res.json({ result: base64Decode(text) });
  } catch (e) {
    res.json({ error: '无效的 Base64 字符串' });
  }
});

// URL 编解码
app.post('/api/url/encode', (req, res) => {
  const { text } = req.body;
  res.json({ result: urlEncode(text) });
});

app.post('/api/url/decode', (req, res) => {
  const { text } = req.body;
  try {
    res.json({ result: urlDecode(text) });
  } catch (e) {
    res.json({ error: '无效的 URL 编码字符串' });
  }
});

// 汉字转拼音
app.post('/api/pinyin', (req, res) => {
  const { text } = req.body;
  const pinyin = text.split('').map(toPinyin).join(' ');
  res.json({ result: pinyin });
});

// 哈希计算
app.post('/api/hash', (req, res) => {
  const { text, type } = req.body;
  const hash = simpleHash(text);
  res.json({ 
    text, 
    hash,
    length: text.length,
    charCodes: text.split('').map(c => c.charCodeAt(0))
  });
});

// 颜色转换
app.post('/api/color/hex2rgb', (req, res) => {
  const { hex } = req.body;
  const rgb = hexToRgb(hex);
  if (rgb) {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    res.json({ hex, rgb, hsl });
  } else {
    res.json({ error: '无效的 HEX 颜色值' });
  }
});

app.post('/api/color/rgb2hex', (req, res) => {
  const { r, g, b } = req.body;
  const hex = rgbToHex(parseInt(r), parseInt(g), parseInt(b));
  res.json({ r, g, b, hex: hex.toUpperCase() });
});

// 随机字符串
app.get('/api/random', (req, res) => {
  const { length, type } = req.query;
  const len = parseInt(length) || 16;
  let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  if (type === 'number') chars = '0123456789';
  if (type === 'letter') chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  res.json({ result, length: len });
});

// 文本统计
app.post('/api/text/stats', (req, res) => {
  const { text } = req.body;
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, '').length;
  const lines = text.split('\n').length;
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  
  // 统计字符频率
  const freq = {};
  for (const char of text) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  const topChars = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  res.json({
    chars,
    charsNoSpaces,
    lines,
    words,
    topChars
  });
});

// 文件编码转换
app.post('/api/file/convert', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.json({ error: '请上传文件' });
  }
  
  const { fromEncoding, toEncoding } = req.body;
  const buffer = fs.readFileSync(req.file.path);
  const result = iconv.convert(buffer, toEncoding, fromEncoding).toString('utf8');
  
  // 清理上传文件
  fs.unlinkSync(req.file.path);
  
  res.json({ 
    filename: req.file.originalname,
    from: fromEncoding,
    to: toEncoding,
    content: result.substring(0, 1000) + (result.length > 1000 ? '...' : '')
  });
});

// JSON 格式化
app.post('/api/json/format', (req, res) => {
  const { text } = req.body;
  try {
    const obj = JSON.parse(text);
    res.json({ 
      formatted: JSON.stringify(obj, null, 2),
      valid: true
    });
  } catch (e) {
    res.json({ 
      error: '无效的 JSON',
      valid: false 
    });
  }
});

// 敏感信息掩码
app.post('/api/mask', (req, res) => {
  const { text, type } = req.body;
  let masked = text;
  
  if (type === 'phone') {
    masked = text.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  } else if (type === 'email') {
    masked = text.replace(/(\w?)(\w+)(\w?@)/, (_, a, b, c) => a + '*'.repeat(b.length - 1) + c);
  } else if (type === 'idcard') {
    masked = text.replace(/(\d{4})\d{10}(\d{4})/, '$1**********$2');
  }
  
  res.json({ original: text, masked });
});

// 数字进制转换
app.post('/api/number/convert', (req, res) => {
  const { value, from, to } = req.body;
  try {
    const decimal = parseInt(value, parseInt(from));
    const result = decimal.toString(parseInt(to));
    res.json({
      value,
      from: parseInt(from),
      to: parseInt(to),
      result,
      decimal: decimal.toString(10)
    });
  } catch (e) {
    res.json({ error: '转换失败，请检查输入' });
  }
});

// 时间戳转换
app.get('/api/timestamp', (req, res) => {
  const { time } = req.query;
  const now = Date.now();
  
  if (time) {
    const date = new Date(parseInt(time));
    res.json({
      timestamp: parseInt(time),
      datetime: date.toLocaleString('zh-CN'),
      date: date.toISOString().split('T')[0]
    });
  } else {
    res.json({
      timestamp: now,
      datetime: new Date(now).toLocaleString('zh-CN'),
      date: new Date(now).toISOString().split('T')[0]
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Alex Tools 运行在 http://localhost:${PORT}`);
});
