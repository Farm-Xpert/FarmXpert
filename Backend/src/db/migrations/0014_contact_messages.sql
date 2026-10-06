-- Messages from the website's contact form. The admin console lists them
-- (new -> read -> replied); support also receives each one by email.
CREATE TABLE contact_messages (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  timestamptz NOT NULL DEFAULT now(),
    name        varchar(80)  NOT NULL,
    email       varchar(160) NOT NULL,
    phone       varchar(20),
    topic       varchar(24)  NOT NULL,
    message     text         NOT NULL,
    status      varchar(12)  NOT NULL DEFAULT 'new',
    handled_at  timestamptz,
    handled_by  uuid REFERENCES users (id) ON DELETE SET NULL,
    ip          varchar(64),
    user_agent  varchar(300),
    CONSTRAINT ck_contact_status CHECK (status IN ('new', 'read', 'replied')),
    CONSTRAINT ck_contact_message_bounded CHECK (char_length(message) <= 3000)
);
CREATE INDEX ix_contact_messages_status_created ON contact_messages (status, created_at DESC);
