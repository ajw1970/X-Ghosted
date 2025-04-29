import { describe, it, expect } from 'vitest';
import { parseUrl } from './parseUrl';

describe('parseUrl', () => {
  it('extracts username and with_replies from profile URL', () => {
    const result = parseUrl('https://x.com/ApostleJohnW/with_replies');
    expect(result).toEqual({
      isWithReplies: true,
      userProfileName: 'ApostleJohnW'
    });
  });

  it('extracts username from profile URL without with_replies', () => {
    const result = parseUrl('https://x.com/ApostleJohnW');
    expect(result).toEqual({
      isWithReplies: false,
      userProfileName: 'ApostleJohnW'
    });
  });

  it('returns null username for reserved path /i', () => {
    const result = parseUrl('https://x.com/i');
    expect(result).toEqual({
      isWithReplies: false,
      userProfileName: null
    });
  });

  it('returns null username for reserved path /notifications', () => {
    const result = parseUrl('https://x.com/notifications');
    expect(result).toEqual({
      isWithReplies: false,
      userProfileName: null
    });
  });

  it('returns null username for reserved path /home', () => {
    const result = parseUrl('https://x.com/home');
    expect(result).toEqual({
      isWithReplies: false,
      userProfileName: null
    });
  });

  it('returns null username for reserved path /explore', () => {
    const result = parseUrl('https://x.com/explore');
    expect(result).toEqual({
      isWithReplies: false,
      userProfileName: null
    });
  });

  it('returns null username for reserved path /messages', () => {
    const result = parseUrl('https://x.com/messages');
    expect(result).toEqual({
      isWithReplies: false,
      userProfileName: null
    });
  });

  it('returns null username for reserved path /compose', () => {
    const result = parseUrl('https://x.com/compose');
    expect(result).toEqual({
      isWithReplies: false,
      userProfileName: null
    });
  });

  it('returns null username for reserved path /settings', () => {
    const result = parseUrl('https://x.com/settings');
    expect(result).toEqual({
      isWithReplies: false,
      userProfileName: null
    });
  });

  it('returns null username for invalid URLs', () => {
    const result = parseUrl('https://example.com/ApostleJohnW');
    expect(result).toEqual({
      isWithReplies: false,
      userProfileName: null
    });
  });

  it('handles URLs with trailing slash', () => {
    const result = parseUrl('https://x.com/ApostleJohnW/');
    expect(result).toEqual({
      isWithReplies: false,
      userProfileName: 'ApostleJohnW'
    });
  });
});