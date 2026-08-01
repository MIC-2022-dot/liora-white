
DROP POLICY "insert notifications for participants" ON public.notifications;
CREATE POLICY "insert notifications for peers" ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversation_participants a
    JOIN public.conversation_participants b ON a.conversation_id = b.conversation_id
    WHERE a.user_id = auth.uid() AND b.user_id = notifications.user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.call_history c
    WHERE (c.caller_id = auth.uid() AND c.callee_id = notifications.user_id)
       OR (c.callee_id = auth.uid() AND c.caller_id = notifications.user_id)
  )
);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_studio_access(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_participant(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_conversation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
