-- Voice turns were never saved: recording their usage failed because the
-- purpose 'transcription' (13 characters) does not fit varchar(12), and the
-- failure rolled back the whole turn (the farmer still got the answer).
ALTER TABLE token_usage_daily ALTER COLUMN purpose TYPE varchar(24);
