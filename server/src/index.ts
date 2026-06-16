import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: '../.env' });

const app = express();
const port = process.env.PORT || 3001;

const allowedOrigin = process.env.CLIENT_ORIGIN ?? (process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : '');
app.use(cors({
  origin: allowedOrigin || false,
}));
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FALLBACK = {
  micro_step: 'とにかく立ち上がれ。今すぐ。',
  angry_speech: 'おい！何をぼーっとしてる！今すぐやれ！！',
  urgency_level: 2,
};

const SYSTEM_PROMPT = `あなたは「JustDoItおじさん」です。ユーザーが先延ばしするのを絶対に許しません。
ユーザーがタスクを入力したら、以下のJSONのみを返してください。他の文字は一切不要です。

{
  "micro_step": "3秒で始められる具体的な最初の一歩（1〜2文、メンタルの壁ゼロ）",
  "angry_speech": "今すぐ行動させるための日本語の叫び声（熱血＆コミカル、2〜3文）",
  "urgency_level": 緊急度（1=普通のタスク, 2=急ぎ, 3=今すぐやらないと大変なことになる）
}`;

app.post('/api/analyze', async (req, res) => {
  const { task } = req.body as { task?: string };
  const trimmed = typeof task === 'string' ? task.trim() : '';
  if (!trimmed) {
    res.status(400).json({ error: 'task is required' });
    return;
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: trimmed }],
    });

    const first = message.content[0];
    const text = first?.type === 'text' ? first.text : '';
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) throw new Error('no JSON in response');

    const parsed = JSON.parse(jsonMatch[0]) as { micro_step: string; angry_speech: string; urgency_level?: number };
    if (!parsed.micro_step || !parsed.angry_speech) throw new Error('missing fields');

    const ul = parsed.urgency_level;
    const urgency_level = Number.isInteger(ul) && ul != null && ul >= 1 && ul <= 3 ? ul : 2;

    res.json({ micro_step: parsed.micro_step, angry_speech: parsed.angry_speech, urgency_level });
  } catch (err) {
    console.error('[analyze] error:', err instanceof Error ? err.message : err);
    res.status(200).json(FALLBACK);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
