# 🔥 Burner - Learn It or Lose It

**Stake your commitment to learn. Pass the exam or lose your money.**

Burner is an AI-powered learning accountability app that uses financial stakes to motivate you to actually learn what you commit to learning.

## How It Works

1. **Make a Commitment** - Choose a topic you want to learn and stake $1-$1000. Set your deadline (1-90 days).
2. **Learn & Prepare** - Study your topic. When ready, take an AI-generated exam tailored to your commitment.
3. **Pass or Burn** - Score 70%+ to save your stake. Fail or miss the deadline? Your money burns forever. 🔥

## Features

- 🎯 **Real Stakes** - Put real money on the line to motivate yourself
- 🤖 **AI-Generated Exams** - Custom exams powered by Cerebras AI
- 🔄 **One Retry** - Failed? You get one retry chance
- ⏱️ **Countdown Timer** - Watch the clock tick down
- 📊 **Track Progress** - See stakes saved, burned, and at risk
- 🔐 **Secure Auth** - Powered by Clerk

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: Shadcn/ui + Tailwind CSS
- **Auth**: Clerk
- **Database**: Supabase (PostgreSQL)
- **AI**: Cerebras (Qwen 3 235B model)
- **Observability**: Opik (optional)
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Supabase account
- Cerebras API key
- Clerk account

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd frontend
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Set up environment variables:
```bash
cp env.example.txt .env
```

Fill in your credentials:
- **Clerk**: Get keys from https://dashboard.clerk.com
- **Supabase**: Get keys from https://supabase.com/dashboard
- **Cerebras**: Get API key from https://cloud.cerebras.ai

4. Run Supabase migrations:
```bash
supabase db push
```

Or manually apply migrations from `supabase/migrations/` in your Supabase dashboard.

5. Start the development server:
```bash
npm run dev
# or
bun dev
```

6. Open http://localhost:3000

## Environment Variables

Required:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `CEREBRAS_API_KEY` - Cerebras API key

Optional:
- `OPIK_API_KEY` - For LLM observability
- `OPIK_WORKSPACE` - Your Opik workspace
- `NEXT_PUBLIC_SENTRY_DSN` - For error tracking

## Database Schema

The app uses 4 main tables:
- `users` - User profiles synced from Clerk
- `commitments` - Learning commitments with stakes
- `exams` - AI-generated exams
- `exam_answers` - User answers and grading results

See `supabase/migrations/` for full schema.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── auth/                       # Auth pages (Clerk)
│   └── dashboard/
│       └── burner/                 # Burner feature
│           ├── page.tsx            # Dashboard
│           ├── commitment/[id]/    # Commitment detail
│           └── exam/[id]/          # Exam pages
├── features/burner/
│   ├── actions/                    # Server actions
│   ├── components/                 # React components
│   ├── services/                   # Business logic
│   ├── types/                      # TypeScript types
│   └── utils/                      # Utilities
└── components/                     # Shared UI components
```

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

---

**Remember: Learn it or lose it. 🔥**
