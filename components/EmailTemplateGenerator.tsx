'use client';

import { useState } from 'react';

interface Template {
  type: 'reengagement_inactive' | 'reengagement_never' | 'promotion_feature' | 'promotion_offer' | 'usage_reminder';
  label: string;
  description: string;
}

const TEMPLATES: Template[] = [
  {
    type: 'reengagement_inactive',
    label: '👋 Re-engage Inactive Users',
    description: 'For users idle 30+ days',
  },
  {
    type: 'reengagement_never',
    label: '🎯 Onboard New Users',
    description: 'For users who never activated',
  },
  {
    type: 'promotion_feature',
    label: '✨ Feature Announcement',
    description: 'Announce new features',
  },
  {
    type: 'promotion_offer',
    label: '🎉 Special Offer',
    description: 'Promote deals & discounts',
  },
  {
    type: 'usage_reminder',
    label: '📊 Usage Reminder',
    description: 'Show quota status to Pro users',
  },
];

interface EmailTemplateGeneratorProps {
  onTemplateGenerated?: (html: string, type: string) => void;
}

export default function EmailTemplateGenerator({ onTemplateGenerated }: EmailTemplateGeneratorProps) {
  const [selectedType, setSelectedType] = useState<Template['type'] | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTemplate = async () => {
    if (!selectedType) {
      setError('Select a template type');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/email/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          customPrompt: customPrompt.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate template');
      }

      const data = (await response.json()) as { html: string };
      setGeneratedHtml(data.html);
      onTemplateGenerated?.(data.html, selectedType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedHtml);
    alert('HTML copied to clipboard!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Template Selection */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
          Template Type
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
          {TEMPLATES.map((t) => (
            <button
              key={t.type}
              className={`btn btn-sm ${selectedType === t.type ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedType(t.type)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', height: 'auto', padding: 10 }}
            >
              <div style={{ fontWeight: 600 }}>{t.label}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{t.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Prompt */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
          Custom Prompt (optional)
        </label>
        <textarea
          className="input"
          placeholder="e.g., 'Make it more casual and fun' or describe what you want..."
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          rows={3}
          style={{ resize: 'vertical' }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: 10, background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn btn-primary"
          onClick={generateTemplate}
          disabled={generating || !selectedType}
        >
          {generating ? 'Generating…' : 'Generate Template'}
        </button>
        {generatedHtml && (
          <>
            <button className="btn btn-secondary" onClick={() => setPreview(!preview)}>
              {preview ? 'Hide Preview' : 'Preview'}
            </button>
            <button className="btn btn-secondary" onClick={copyToClipboard}>
              Copy HTML
            </button>
          </>
        )}
      </div>

      {/* Preview */}
      {preview && generatedHtml && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: 'var(--surface-2)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>Preview</div>
          <div
            style={{
              background: '#fff',
              color: '#000',
              borderRadius: 8,
              padding: 16,
              maxHeight: 400,
              overflow: 'auto',
            }}
            dangerouslySetInnerHTML={{ __html: generatedHtml }}
          />
        </div>
      )}
    </div>
  );
}
