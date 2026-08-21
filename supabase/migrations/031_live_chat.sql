-- Create support_conversations table
CREATE TABLE IF NOT EXISTS public.support_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    unread_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create support_messages table
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- null if system
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_conv_user_id ON public.support_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_msg_conv_id ON public.support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_msg_created_at ON public.support_messages(created_at);

-- RLS
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Admins and operators can manage all
CREATE POLICY "Admins and operators can view all conversations"
    ON public.support_conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR profiles.role = 'operator')
        )
    );

CREATE POLICY "Admins and operators can manage all conversations"
    ON public.support_conversations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR profiles.role = 'operator')
        )
    );

CREATE POLICY "Users can view their own conversation"
    ON public.support_conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own conversation"
    ON public.support_conversations FOR ALL
    USING (auth.uid() = user_id);


-- Messages RLS
CREATE POLICY "Admins and operators can view all messages"
    ON public.support_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR profiles.role = 'operator')
        )
    );

CREATE POLICY "Admins and operators can insert messages"
    ON public.support_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR profiles.role = 'operator')
        )
    );
    
CREATE POLICY "Admins and operators can update messages"
    ON public.support_messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR profiles.role = 'operator')
        )
    );

CREATE POLICY "Users can view messages in their conversation"
    ON public.support_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM support_conversations
            WHERE support_conversations.id = support_messages.conversation_id
            AND support_conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages in their conversation"
    ON public.support_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_conversations
            WHERE support_conversations.id = support_messages.conversation_id
            AND support_conversations.user_id = auth.uid()
        )
    );
    
CREATE POLICY "Users can update their messages"
    ON public.support_messages FOR UPDATE
    USING (sender_id = auth.uid());

-- Triggers for updated_at and last_message/last_message_at on conversations
CREATE OR REPLACE FUNCTION update_support_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE support_conversations
    SET 
        last_message = NEW.message,
        last_message_at = NEW.created_at,
        updated_at = NOW(),
        unread_count = unread_count + 1
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_support_message_created ON public.support_messages;
CREATE TRIGGER on_support_message_created
    AFTER INSERT ON public.support_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_support_conversation_on_message();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE support_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
