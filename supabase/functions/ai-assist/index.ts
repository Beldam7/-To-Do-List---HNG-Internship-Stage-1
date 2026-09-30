// Focus AI — AI Assistant Edge Function
// Handles all OpenAI-powered features: parse-task, break-down, brain-dump,
// organize-inbox, plan-day, next-task, make-actionable.
//
// Key resolution order:
//   1. userApiKey passed in the request body (user's own key, validated server-side)
//   2. OPENAI_API_KEY environment secret (server-wide fallback)

import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SERVER_OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

interface AuthUser {
  id: string;
}

async function getAuthenticatedUser(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await tempClient.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id };
}

function resolveApiKey(userApiKey?: string): string {
  // Validate that a user-supplied key looks like a real OpenAI key
  if (userApiKey && typeof userApiKey === 'string' && userApiKey.startsWith('sk-') && userApiKey.length > 20) {
    return userApiKey;
  }
  if (SERVER_OPENAI_KEY) {
    return SERVER_OPENAI_KEY;
  }
  throw new Error(
    'No OpenAI API key configured. Add your key in Settings → Connect OpenAI, or ask your admin to set the server key.'
  );
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  schemaDescription: string,
  apiKey: string
): Promise<unknown> {
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: `${systemPrompt}\n\nYou must respond with valid JSON only. No markdown, no code fences, no extra text.\nThe JSON schema is:\n${schemaDescription}`,
        },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    // Surface auth errors clearly so the user knows their key is wrong
    if (response.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check the key you entered in Settings.');
    }
    if (response.status === 429) {
      throw new Error('OpenAI rate limit reached. Please wait a moment and try again.');
    }
    throw new Error(`OpenAI API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');

  try {
    return JSON.parse(content);
  } catch {
    throw new Error('Invalid JSON from OpenAI');
  }
}

// ─── Action handlers ────────────────────────────────────────

function handleParseTask(input: { text: string; timezone: string; currentDate: string }, apiKey: string) {
  const schema = `{
    "title": string (cleaned, concise task title),
    "description": string | null,
    "dueDate": string | null (ISO date YYYY-MM-DD, or null if no date mentioned),
    "dueTime": string | null (HH:MM 24h format, or null),
    "priority": number (1=High, 2=Medium, 3=Low),
    "estimatedMinutes": number | null
  }`;

  const systemPrompt = `You are a task parsing assistant for the Focus AI productivity app.
The user's timezone is ${input.timezone}. Today's date is ${input.currentDate}.

Parse the user's natural language input into a structured task.
Rules:
- Extract the title by removing date/time/priority words from the original text.
- Convert relative dates (today, tomorrow, next Monday, etc.) to absolute ISO dates (YYYY-MM-DD).
- "tonight" means today at 19:00. "morning" means 09:00. "afternoon" means 14:00. "evening" means 18:00.
- Only set a dueDate if the user explicitly mentions a date or time.
- Only set a dueTime if the user explicitly mentions a time.
- Only set priority to 1 (High) if the user says "urgent", "important", "asap", or similar. Default to 2 (Medium).
- Only set estimatedMinutes if the user mentions a duration. Otherwise null.
- Never invent dates, times, or priorities not implied by the input.
- If the input is just a simple task like "Buy groceries", set dueDate=null, dueTime=null, priority=2.`;

  return callOpenAI(systemPrompt, input.text, schema, apiKey);
}

function handleBreakDown(input: { taskTitle: string; taskDescription?: string }, apiKey: string) {
  const schema = `{
    "subtasks": [{ "title": string }]
  }`;

  const systemPrompt = `You are a task breakdown assistant for the Focus AI productivity app.
Break the given task into actionable, ordered subtasks (5-10 items).
Each subtask should be a concrete, doable action.
Keep titles short and clear. Don't include the parent task itself.`;

  const userPrompt = `Task: ${input.taskTitle}${input.taskDescription ? `\nDescription: ${input.taskDescription}` : ''}`;

  return callOpenAI(systemPrompt, userPrompt, schema, apiKey);
}

function handleMakeActionable(input: { taskTitle: string; taskDescription?: string }, apiKey: string) {
  const schema = `{
    "subtasks": [{ "title": string }]
  }`;

  const systemPrompt = `You are a task actionability assistant for the Focus AI productivity app.
The user has a vague task. Suggest concrete, actionable steps to accomplish it (4-8 items).
Each step should be a specific, doable action that moves toward completing the task.
Keep titles short and clear.`;

  const userPrompt = `Task: ${input.taskTitle}${input.taskDescription ? `\nDescription: ${input.taskDescription}` : ''}`;

  return callOpenAI(systemPrompt, userPrompt, schema, apiKey);
}

function handleBrainDump(input: { text: string; timezone: string; currentDate: string }, apiKey: string) {
  const schema = `{
    "tasks": [{
      "title": string,
      "dueDate": string | null (ISO date YYYY-MM-DD),
      "dueTime": string | null (HH:MM 24h),
      "priority": number (1=High, 2=Medium, 3=Low)
    }]
  }`;

  const systemPrompt = `You are a brain dump assistant for the Focus AI productivity app.
The user's timezone is ${input.timezone}. Today's date is ${input.currentDate}.

Extract individual tasks from the user's messy, stream-of-consciousness text.
Rules:
- Each task should be a clear, standalone action item.
- Extract dates/times if mentioned, converting relative dates to absolute ISO dates.
- Only set priority to 1 if urgency is explicit. Default to 2.
- Only include dueDate/dueTime if explicitly mentioned.
- Don't invent information. If no date is mentioned, dueDate should be null.
- Keep titles concise but descriptive.`;

  return callOpenAI(systemPrompt, input.text, schema, apiKey);
}

function handleOrganizeInbox(input: {
  tasks: { id: string; title: string; description?: string | null }[];
  projects: { id: string; name: string }[];
  timezone: string;
  currentDate: string;
}, apiKey: string) {
  const schema = `{
    "suggestions": [{
      "taskId": string,
      "taskTitle": string,
      "projectName": string | null (must match an existing project name, or null),
      "priority": number (1=High, 2=Medium, 3=Low),
      "dueDate": string | null (ISO date),
      "estimatedMinutes": number | null
    }]
  }`;

  const systemPrompt = `You are an inbox organization assistant for the Focus AI productivity app.
The user's timezone is ${input.timezone}. Today's date is ${input.currentDate}.

Analyze each task and suggest organization:
- projectName: Match to one of the existing projects if appropriate, otherwise null.
- priority: Assign based on urgency and importance (1=High, 2=Medium, 3=Low).
- dueDate: Suggest a deadline only if the task seems time-sensitive. Otherwise null.
- estimatedMinutes: Estimate based on the task complexity. Otherwise null.
- Never invent information. Only suggest what's reasonable from the task title.`;

  const userPrompt = `Existing projects: ${JSON.stringify(input.projects)}\nTasks to organize: ${JSON.stringify(input.tasks)}`;

  return callOpenAI(systemPrompt, userPrompt, schema, apiKey);
}

function handlePlanDay(input: {
  tasks: { id: string; title: string; priority: number; dueDate: string | null; dueTime: string | null; estimatedMinutes: number | null; completed: boolean }[];
  timezone: string;
  currentDate: string;
  workHours: { start: string; end: string };
}, apiKey: string) {
  const schema = `{
    "plan": [{
      "taskId": string | null,
      "title": string,
      "startTime": string (HH:MM 24h),
      "endTime": string (HH:MM 24h),
      "isBreak": boolean
    }]
  }`;

  const systemPrompt = `You are a day planning assistant for the Focus AI productivity app.
The user's timezone is ${input.timezone}. Today's date is ${input.currentDate}.
Working hours: ${input.workHours.start} to ${input.workHours.end}.

Create a realistic schedule for today:
- Prioritize overdue tasks, then high priority, then due today.
- Respect estimated durations. If unknown, assume 30 minutes.
- Include short 10-15 minute breaks between intense tasks.
- Use 24h time format (HH:MM).
- Only schedule unfinished tasks.
- Start at ${input.workHours.start} or the first task's dueTime, whichever is earlier.
- Keep the schedule within working hours where possible.`;

  const userPrompt = `Tasks: ${JSON.stringify(input.tasks)}`;

  return callOpenAI(systemPrompt, userPrompt, schema, apiKey);
}

function handleNextTask(input: {
  tasks: { id: string; title: string; priority: number; dueDate: string | null; dueTime: string | null; estimatedMinutes: number | null; completed: boolean }[];
  timezone: string;
  currentDate: string;
}, apiKey: string) {
  const schema = `{
    "taskId": string,
    "reason": string (2-3 sentences explaining why this task),
    "estimatedMinutes": number | null
  }`;

  const systemPrompt = `You are a task recommendation assistant for the Focus AI productivity app.
The user's timezone is ${input.timezone}. Today's date is ${input.currentDate}.

Recommend the ONE task the user should work on next.
Scoring factors (in priority order):
1. Overdue tasks (highest priority)
2. Tasks due today
3. High priority tasks (priority=1)
4. Quick wins (low estimated time) to build momentum
5. Tasks with specific due times

Explain the recommendation in 2-3 short sentences referencing the specific factors.
Only recommend from unfinished tasks. If no tasks, return {"taskId":"","reason":"You're all caught up! No tasks to work on right now.","estimatedMinutes":null}.`;

  const userPrompt = `Unfinished tasks: ${JSON.stringify(input.tasks)}`;

  return callOpenAI(systemPrompt, userPrompt, schema, apiKey);
}

// ─── Test endpoint ───────────────────────────────────────────

async function handleTestKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (response.status === 200) return { valid: true };
    if (response.status === 401) return { valid: false, error: 'Invalid API key. Please check and try again.' };
    return { valid: false, error: `Unexpected response (${response.status})` };
  } catch (err) {
    return { valid: false, error: 'Could not reach OpenAI. Check your internet connection.' };
  }
}

// ─── Main handler ───────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, userApiKey, ...params } = body;

    // Special action: test a user-supplied key
    if (action === 'test-key') {
      const keyToTest = userApiKey as string | undefined;
      if (!keyToTest || !keyToTest.startsWith('sk-')) {
        return new Response(
          JSON.stringify({ data: { valid: false, error: 'Key must start with sk-' } }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const result = await handleTestKey(keyToTest);
      return new Response(
        JSON.stringify({ data: result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve which key to use for this request
    const apiKey = resolveApiKey(userApiKey as string | undefined);

    let output: unknown;
    switch (action) {
      case 'parse-task':
        output = await handleParseTask(params as { text: string; timezone: string; currentDate: string }, apiKey);
        break;
      case 'break-down':
        output = await handleBreakDown(params as { taskTitle: string; taskDescription?: string }, apiKey);
        break;
      case 'make-actionable':
        output = await handleMakeActionable(params as { taskTitle: string; taskDescription?: string }, apiKey);
        break;
      case 'brain-dump':
        output = await handleBrainDump(params as { text: string; timezone: string; currentDate: string }, apiKey);
        break;
      case 'organize-inbox':
        output = await handleOrganizeInbox(params as { tasks: { id: string; title: string; description?: string | null }[]; projects: { id: string; name: string }[]; timezone: string; currentDate: string }, apiKey);
        break;
      case 'plan-day':
        output = await handlePlanDay(params as { tasks: { id: string; title: string; priority: number; dueDate: string | null; dueTime: string | null; estimatedMinutes: number | null; completed: boolean }[]; timezone: string; currentDate: string; workHours: { start: string; end: string } }, apiKey);
        break;
      case 'next-task':
        output = await handleNextTask(params as { tasks: { id: string; title: string; priority: number; dueDate: string | null; dueTime: string | null; estimatedMinutes: number | null; completed: boolean }[]; timezone: string; currentDate: string }, apiKey);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Log the AI action asynchronously (best-effort)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && serviceKey) {
      try {
        const serviceClient = createClient(supabaseUrl, serviceKey);
        await serviceClient.from('ai_actions').insert({
          user_id: user.id,
          action_type: action,
          input: params,
          output,
        });
      } catch {
        // Best-effort logging — don't fail the request
      }
    }

    return new Response(
      JSON.stringify({ data: output }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const isKeyError = message.includes('API key') || message.includes('Invalid OpenAI');
    const status = message.includes('not configured') ? 503 : isKeyError ? 401 : message.includes('OpenAI') ? 502 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
