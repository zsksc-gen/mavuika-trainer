import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';

export default function DynamicIsland({ running }) {
  const [expanded, setExpanded] = useState(false);
  const [tutContent, setTutContent] = useState('');
  const [credContent, setCredContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tutorials'); // 'tutorials' | 'credits'
  const contentRef = useRef(null);

  useEffect(() => {
    const fetchMD = (path) => {
      return fetch(path)
        .then((res) => {
          if (!res.ok) throw new Error('Not found');
          return res.text();
        });
    };

    // Parser for YouTube links
    const parseYT = (html) => {
      const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/g;
      return html.replace(ytRegex, (match, videoId) => {
        return `<div class="yt-embed-wrapper"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
      });
    };

    const renderMD = (mdText) => {
      if (!mdText) return '';
      let html = parseYT(mdText);
      if (marked) {
        const renderer = new marked.Renderer();
        renderer.link = (first, title, text) => {
          let href = first;
          if (first && typeof first === 'object') {
            href = first.href;
            title = first.title;
            text = first.text;
          }
          return `<a href="${href || ''}" target="_blank" rel="noopener noreferrer" title="${title || ''}">${text || ''}</a>`;
        };
        return marked.parse(html, { renderer });
      }
      // Fallback simple markdown link parser: [text](url) -> <a href="url">text</a>
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      html = html.replace(linkRegex, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      return html.replace(/\n/g, '<br>');
    };

    Promise.all([
      fetchMD('learn/tutorials.md'),
      fetchMD('learn/credits.md')
    ])
      .then(([tutText, credText]) => {
        setTutContent(renderMD(tutText));
        setCredContent(renderMD(credText));
        setLoading(false);
      })
      .catch(() => {
        setTutContent('<p style="color: var(--severity-critical)">Failed to load tutorials</p>');
        setCredContent('<p style="color: var(--severity-critical)">Failed to load credits</p>');
        setLoading(false);
      });
  }, []);

  if (running) return null; // Hidden while playing

  // White theme minimalist styles (no shadow)
  const islandStyle = {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-light)',
    boxShadow: 'none',
    transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
    fontFamily: 'var(--font-body)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    
    // Morph dimensions (adjusted for 1.3x document zoom)
    width: expanded ? '840px' : '200px',
    maxWidth: expanded ? '73vw' : '95vw',
    height: expanded ? '68vh' : '38px',
    maxHeight: expanded ? '70vh' : '95vh',
    borderRadius: expanded ? '24px' : '19px',
    padding: expanded ? '20px 24px' : '0 16px',
    cursor: expanded ? 'default' : 'pointer',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: expanded ? 'auto' : '38px',
    userSelect: 'none',
  };

  const titleStyle = {
    fontSize: expanded ? '13px' : '11px',
    fontWeight: '600',
    letterSpacing: expanded ? '0.05em' : '0.08em',
    textTransform: 'uppercase',
    color: expanded ? 'var(--text-muted)' : 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const tabButtonStyle = (tabId) => ({
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: activeTab === tabId ? '700' : '500',
    color: activeTab === tabId ? 'var(--text-primary)' : 'var(--text-muted)',
    padding: '6px 12px 10px',
    borderBottom: activeTab === tabId ? '2px solid var(--text-primary)' : '2px solid transparent',
    transition: 'all 0.2s',
  });

  return (
    <>
      {/* Light dimming overlay when expanded */}
      {expanded && (
        <div 
          onClick={() => setExpanded(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 9998,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      <div 
        style={islandStyle}
        onClick={!expanded ? () => setExpanded(true) : undefined}
      >
        {/* Island Header */}
        <div style={headerStyle}>
          <div style={titleStyle}>
            <span style={{ color: 'var(--text-muted)' }}>✦</span>
            <span>{expanded ? 'Menu' : 'Tutorials & Credits'}</span>
          </div>
          {expanded ? (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(false);
              }}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-primary)',
                width: 26,
                height: 26,
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--border-light)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--bg-secondary)'}
            >
              ✕
            </button>
          ) : (
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: '600' }}>INFO</span>
          )}
        </div>

        {/* Dynamic Island Tabs */}
        {expanded && (
          <div style={{ 
            display: 'flex', 
            gap: 8, 
            borderBottom: '1px solid var(--border-light)', 
            marginTop: 14,
            marginBottom: 2
          }}>
            <button 
              onClick={() => setActiveTab('tutorials')}
              style={tabButtonStyle('tutorials')}
            >
              Tutorials
            </button>
            <button 
              onClick={() => setActiveTab('credits')}
              style={tabButtonStyle('credits')}
            >
              Credits
            </button>
          </div>
        )}

        {/* Tab Content Area */}
        {expanded && (
          <div 
            ref={contentRef}
            className="island-markdown-content"
            style={{
              flex: 1,
              marginTop: 16,
              overflowY: 'auto',
              fontSize: '13.5px',
              lineHeight: '1.6',
              color: 'var(--text-secondary)',
            }}
            dangerouslySetInnerHTML={{ 
              __html: loading ? '<p>Loading...</p>' : (activeTab === 'tutorials' ? tutContent : credContent) 
            }}
          />
        )}
      </div>
    </>
  );
}
