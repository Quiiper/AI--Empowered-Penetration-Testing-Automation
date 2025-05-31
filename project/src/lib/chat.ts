export interface Chat {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface Message {
  content: string;
  sender: 'user' | 'bot';
  created_at: string;
}

export async function getChats(userId: string): Promise<Chat[]> {
  const response = await fetch(`/api/chats?user_id=${userId}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch chats');
  }
  return response.json();
}

export async function createChat(userId: string): Promise<Chat> {
  const response = await fetch('/api/chats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create chat');
  }
  return response.json();
}

export async function deleteChat(chatId: string): Promise<void> {
  const response = await fetch(`/api/chats/${chatId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete chat');
  }
}

export async function getChatMessages(chatId: string): Promise<Message[]> {
  const response = await fetch(`/api/chats/${chatId}/messages`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch messages');
  }
  return response.json();
}

export async function updateChatTitle(chatId: string, title: string): Promise<void> {
  const response = await fetch(`/api/chats/${chatId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update chat title');
  }
} 