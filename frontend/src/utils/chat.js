export function formatChatHistory(data) {
  return data
    .slice()
    .flatMap((item) => {
      let sources = item.sources || [];
      if (typeof sources === 'string') {
        try {
          sources = JSON.parse(sources);
        } catch {
          sources = [];
        }
      }
      return [
        {
          id: `${item.id}-q`,
          role: 'user',
          content: item.question,
          created_at: item.created_at,
        },
        {
          id: `${item.id}-a`,
          role: 'assistant',
          answer: item.answer,
          sources,
          chunks_used: item.chunks_used,
          created_at: item.created_at,
        },
      ];
    });
}

export function getHistoryPairs(messages) {
  const pairs = [];
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === 'user') {
      const next = messages[i + 1];
      pairs.push({
        id: messages[i].id,
        question: messages[i],
        answer: next?.role === 'assistant' && !next.error ? next : null,
      });
    }
  }
  return pairs.reverse();
}

export const SUGGESTED_QUESTIONS = [
  'What is the main entry point of this project?',
  'How does authentication work?',
  'Explain the folder structure',
  'What are the key dependencies?',
  'How is data stored and retrieved?',
  'What API endpoints are available?',
];
