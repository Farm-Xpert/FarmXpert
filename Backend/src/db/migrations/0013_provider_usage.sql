-- OpenAI's own record of usage and billing, synced from its Usage and Costs
-- API (see src/jobs/openaiUsage.js). The admin totals read these, so they
-- match the platform.openai.com dashboard exactly; token_usage_daily keeps
-- the per-farmer detail that OpenAI cannot know.

CREATE TABLE provider_usage_daily (
    usage_date   date        NOT NULL,          -- UTC day, as OpenAI buckets it
    provider     varchar(24) NOT NULL DEFAULT 'openai',
    kind         varchar(24) NOT NULL,          -- completions | embeddings | speech | transcription
    model        varchar(80) NOT NULL,
    input_tokens      bigint NOT NULL DEFAULT 0,
    output_tokens     bigint NOT NULL DEFAULT 0,
    cached_tokens     bigint NOT NULL DEFAULT 0,
    audio_tokens      bigint NOT NULL DEFAULT 0,
    requests          bigint NOT NULL DEFAULT 0,
    audio_seconds     numeric(12, 2) NOT NULL DEFAULT 0,
    characters        bigint NOT NULL DEFAULT 0,
    synced_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (usage_date, provider, kind, model)
);

CREATE TABLE provider_costs_daily (
    usage_date   date        NOT NULL,
    provider     varchar(24) NOT NULL DEFAULT 'openai',
    amount       numeric(14, 6) NOT NULL DEFAULT 0,
    currency     varchar(8)  NOT NULL DEFAULT 'usd',
    synced_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (usage_date, provider)
);
