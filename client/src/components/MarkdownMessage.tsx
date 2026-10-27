import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownMessageProps {
  content: string;
  isUser?: boolean;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, isUser = false }) => {
  // Normalize leading bullet characters (like • or ●) into standard markdown bullet '*'
  const normalizedContent = (content || '')
    .replace(/^[ \t]*[•●]\s+/gm, '* ')
    .trim();

  return (
    <div className={`markdown-message-wrapper ${isUser ? 'user-mode' : 'bot-mode'}`} style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: isUser ? '#FFFFFF' : '#0F2942',
              marginTop: '12px',
              marginBottom: '6px',
              borderBottom: isUser ? '1px solid rgba(255,255,255,0.2)' : '1px solid #E2E8F0',
              paddingBottom: '4px'
            }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: isUser ? '#FFFFFF' : '#0F4C81',
              marginTop: '10px',
              marginBottom: '6px'
            }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{
              fontSize: '0.96rem',
              fontWeight: 700,
              color: isUser ? '#FFFFFF' : '#0F4C81',
              marginTop: '10px',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color: isUser ? '#FFFFFF' : '#1E293B',
              marginTop: '8px',
              marginBottom: '4px'
            }}>
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p style={{
              margin: '0 0 8px 0',
              lineHeight: 1.55,
              color: isUser ? '#FFFFFF' : '#1E293B',
              wordBreak: 'break-word'
            }}>
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul style={{
              margin: '4px 0 10px 0',
              paddingLeft: '22px',
              listStyleType: 'disc',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol style={{
              margin: '4px 0 10px 0',
              paddingLeft: '22px',
              listStyleType: 'decimal',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li style={{
              lineHeight: 1.55,
              color: isUser ? 'rgba(255,255,255,0.95)' : '#334155',
              wordBreak: 'break-word'
            }}>
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong style={{
              fontWeight: 700,
              color: isUser ? '#FFFFFF' : '#0F172A'
            }}>
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em style={{
              fontStyle: 'italic',
              color: isUser ? 'rgba(255,255,255,0.85)' : '#64748B'
            }}>
              {children}
            </em>
          ),
          blockquote: ({ children }) => (
            <blockquote style={{
              margin: '8px 0',
              padding: '8px 12px',
              borderLeft: isUser ? '3px solid #FFFFFF' : '3px solid #F59E0B',
              backgroundColor: isUser ? 'rgba(255,255,255,0.12)' : '#FEF3C7',
              borderRadius: '0 8px 8px 0',
              color: isUser ? '#FFFFFF' : '#92400E',
              fontSize: '0.84rem',
              lineHeight: 1.45
            }}>
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '10px 0' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.82rem',
                border: isUser ? '1px solid rgba(255,255,255,0.2)' : '1px solid #CBD5E1'
              }}>
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th style={{
              backgroundColor: isUser ? 'rgba(255,255,255,0.15)' : '#F1F5F9',
              color: isUser ? '#FFFFFF' : '#0F2942',
              fontWeight: 700,
              padding: '6px 10px',
              border: isUser ? '1px solid rgba(255,255,255,0.2)' : '1px solid #E2E8F0',
              textAlign: 'left'
            }}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td style={{
              padding: '6px 10px',
              border: isUser ? '1px solid rgba(255,255,255,0.15)' : '1px solid #E2E8F0',
              color: isUser ? '#FFFFFF' : '#334155'
            }}>
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{
                color: isUser ? '#FFFFFF' : '#0284C7',
                textDecoration: 'underline',
                fontWeight: 600
              }}
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code style={{
              backgroundColor: isUser ? 'rgba(255,255,255,0.18)' : '#F1F5F9',
              color: isUser ? '#FFFFFF' : '#0F4C81',
              padding: '1px 5px',
              borderRadius: '4px',
              fontSize: '0.85em',
              fontFamily: 'Consolas, Monaco, monospace'
            }}>
              {children}
            </code>
          ),
          hr: () => (
            <hr style={{
              border: 'none',
              borderTop: isUser ? '1px solid rgba(255,255,255,0.2)' : '1px solid #E2E8F0',
              margin: '12px 0'
            }} />
          )
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
};
