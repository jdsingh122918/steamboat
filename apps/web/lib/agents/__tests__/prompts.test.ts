import { describe, it, expect } from 'vitest';

import {
  getSystemPrompt,
  buildUserPrompt,
  PromptTemplate,
  RECEIPT_PROCESSOR_PROMPT,
  PAYMENT_ASSISTANT_PROMPT,
  EXPENSE_RECONCILER_PROMPT,
  GALLERY_ORGANIZER_PROMPT,
  ACTIVITY_RECOMMENDER_PROMPT,
  POLL_DECISION_PROMPT,
} from '../prompts';
import { AgentRole } from '../types';

describe('Agent Prompts', () => {
  describe('System Prompts', () => {
    it('should have receipt processor prompt', () => {
      expect(RECEIPT_PROCESSOR_PROMPT).toBeDefined();
      expect(RECEIPT_PROCESSOR_PROMPT).toContain('receipt');
    });

    it('should have payment assistant prompt', () => {
      expect(PAYMENT_ASSISTANT_PROMPT).toBeDefined();
      expect(PAYMENT_ASSISTANT_PROMPT).toContain('payment');
    });

    it('should have expense reconciler prompt', () => {
      expect(EXPENSE_RECONCILER_PROMPT).toBeDefined();
      expect(EXPENSE_RECONCILER_PROMPT).toContain('expense');
    });

    it('should have gallery organizer prompt', () => {
      expect(GALLERY_ORGANIZER_PROMPT).toBeDefined();
      expect(GALLERY_ORGANIZER_PROMPT).toContain('media');
    });

    it('should have activity recommender prompt', () => {
      expect(ACTIVITY_RECOMMENDER_PROMPT).toBeDefined();
      expect(ACTIVITY_RECOMMENDER_PROMPT).toContain('activit');
    });

    it('should have poll decision prompt', () => {
      expect(POLL_DECISION_PROMPT).toBeDefined();
      expect(POLL_DECISION_PROMPT).toContain('poll');
    });
  });

  describe('getSystemPrompt', () => {
    it('should return receipt processor prompt for RECEIPT_PROCESSOR role', () => {
      const prompt = getSystemPrompt(AgentRole.RECEIPT_PROCESSOR);
      expect(prompt).toBe(RECEIPT_PROCESSOR_PROMPT);
    });

    it('should return payment assistant prompt for PAYMENT_ASSISTANT role', () => {
      const prompt = getSystemPrompt(AgentRole.PAYMENT_ASSISTANT);
      expect(prompt).toBe(PAYMENT_ASSISTANT_PROMPT);
    });

    it('should return expense reconciler prompt for EXPENSE_RECONCILER role', () => {
      const prompt = getSystemPrompt(AgentRole.EXPENSE_RECONCILER);
      expect(prompt).toBe(EXPENSE_RECONCILER_PROMPT);
    });

    it('should return gallery organizer prompt for GALLERY_ORGANIZER role', () => {
      const prompt = getSystemPrompt(AgentRole.GALLERY_ORGANIZER);
      expect(prompt).toBe(GALLERY_ORGANIZER_PROMPT);
    });

    it('should return activity recommender prompt for ACTIVITY_RECOMMENDER role', () => {
      const prompt = getSystemPrompt(AgentRole.ACTIVITY_RECOMMENDER);
      expect(prompt).toBe(ACTIVITY_RECOMMENDER_PROMPT);
    });

    it('should return poll decision prompt for POLL_DECISION role', () => {
      const prompt = getSystemPrompt(AgentRole.POLL_DECISION);
      expect(prompt).toBe(POLL_DECISION_PROMPT);
    });
  });

  describe('PromptTemplate', () => {
    it('should create a template with variables', () => {
      const template = new PromptTemplate('Hello, {{name}}!');
      const result = template.format({ name: 'World' });
      expect(result).toBe('Hello, World!');
    });

    it('should handle multiple variables', () => {
      const template = new PromptTemplate('{{greeting}}, {{name}}! Welcome to {{place}}.');
      const result = template.format({
        greeting: 'Hello',
        name: 'User',
        place: 'Steamboat',
      });
      expect(result).toBe('Hello, User! Welcome to Steamboat.');
    });

    it('should handle missing variables gracefully', () => {
      const template = new PromptTemplate('Hello, {{name}}!');
      const result = template.format({});
      expect(result).toBe('Hello, {{name}}!');
    });

    it('should handle repeated variables', () => {
      const template = new PromptTemplate('{{name}} said: Hello {{name}}!');
      const result = template.format({ name: 'Alice' });
      expect(result).toBe('Alice said: Hello Alice!');
    });

    it('should preserve whitespace', () => {
      const template = new PromptTemplate('Line 1: {{a}}\nLine 2: {{b}}');
      const result = template.format({ a: 'first', b: 'second' });
      expect(result).toBe('Line 1: first\nLine 2: second');
    });
  });

  describe('buildUserPrompt', () => {
    it('should build receipt processing prompt', () => {
      const prompt = buildUserPrompt('receipt', {
        imageUrl: 'https://example.com/receipt.jpg',
        tripName: 'Vegas Trip',
      });

      expect(prompt).toContain('receipt.jpg');
      expect(prompt).toContain('Vegas Trip');
    });

    it('should build payment split prompt', () => {
      const prompt = buildUserPrompt('payment_split', {
        amount: 150.0,
        participants: ['Alice', 'Bob', 'Charlie'],
        description: 'Dinner at restaurant',
      });

      expect(prompt).toContain('150');
      expect(prompt).toContain('Alice');
      expect(prompt).toContain('Dinner');
    });

    it('should build expense reconciliation prompt', () => {
      const prompt = buildUserPrompt('reconciliation', {
        expenses: [
          { id: '1', amount: 100, paidBy: 'Alice' },
          { id: '2', amount: 50, paidBy: 'Bob' },
        ],
        attendees: ['Alice', 'Bob', 'Charlie'],
      });

      expect(prompt).toContain('expense');
      expect(prompt).toContain('Alice');
    });

    it('should build gallery organization prompt', () => {
      const prompt = buildUserPrompt('gallery', {
        mediaCount: 50,
        tripName: 'Bachelor Party',
        existingTags: ['group', 'activity', 'food'],
      });

      expect(prompt).toContain('50');
      expect(prompt).toContain('Bachelor Party');
    });

    it('should build activity recommendation prompt', () => {
      const prompt = buildUserPrompt('activity', {
        location: 'Steamboat, Colorado',
        interests: ['skiing', 'nightlife', 'dining'],
        budget: 'moderate',
        groupSize: 8,
      });

      expect(prompt).toContain('Steamboat');
      expect(prompt).toContain('skiing');
      expect(prompt).toContain('8');
    });

    it('should build poll analysis prompt', () => {
      const prompt = buildUserPrompt('poll', {
        question: 'Which restaurant for dinner?',
        options: ['Italian', 'Mexican', 'Steakhouse'],
        votes: { Italian: 3, Mexican: 2, Steakhouse: 4 },
      });

      expect(prompt).toContain('restaurant');
      expect(prompt).toContain('Steakhouse');
    });
  });
});
