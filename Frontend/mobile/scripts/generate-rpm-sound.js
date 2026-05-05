#!/usr/bin/env node

/**
 * Script to generate RPM notification sound
 * Creates a "Ting" sound followed by silence for TTS "RPM"
 */

const fs = require('fs');
const path = require('path');

const soundsDir = path.join(__dirname, '..', 'assets', 'sounds');
const tingFile = path.join(soundsDir, 'ting.wav');
const rpmFile = path.join(soundsDir, 'rpm_notification.wav');

/**
 * Create a "Ting" bell-like sound
 * Uses multiple sine waves to create a pleasant notification sound
 */
function createTingSound() {
  const sampleRate = 44100;
  const duration = 0.8; // 0.8 seconds
  const numSamples = Math.floor(sampleRate * duration);
  
  // Create buffer for WAV file
  const buffer = Buffer.alloc(44 + numSamples * 2);
  
  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM format size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(1, 22);  // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
  buffer.writeUInt16LE(2, 32);  // Block align
  buffer.writeUInt16LE(16, 34); // Bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  
  // Generate "Ting" sound with multiple harmonics
  const frequencies = [800, 1200, 1600]; // Bell-like frequencies
  const amplitudes = [0.4, 0.2, 0.1];    // Decreasing amplitudes
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    
    // Add multiple frequencies for richer sound
    for (let j = 0; j < frequencies.length; j++) {
      const freq = frequencies[j];
      const amp = amplitudes[j];
      
      // Exponential decay envelope for bell-like sound
      const envelope = Math.exp(-5 * t);
      
      sample += Math.sin(2 * Math.PI * freq * t) * amp * envelope;
    }
    
    // Convert to 16-bit integer
    const value = Math.round(sample * 32767);
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, value)), 44 + i * 2);
  }
  
  return buffer;
}

/**
 * Create RPM notification sound (Ting + silence for TTS)
 * Total duration: ~2.5 seconds (0.8s ting + 1.7s silence for "R P M")
 */
function createRPMNotificationSound() {
  const sampleRate = 44100;
  const tingDuration = 0.8;
  const silenceDuration = 1.7; // Time for TTS to say "R P M"
  const totalDuration = tingDuration + silenceDuration;
  const numSamples = Math.floor(sampleRate * totalDuration);
  const tingSamples = Math.floor(sampleRate * tingDuration);
  
  // Create buffer for WAV file
  const buffer = Buffer.alloc(44 + numSamples * 2);
  
  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  
  // Generate "Ting" sound
  const frequencies = [800, 1200, 1600];
  const amplitudes = [0.4, 0.2, 0.1];
  
  for (let i = 0; i < tingSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    
    for (let j = 0; j < frequencies.length; j++) {
      const freq = frequencies[j];
      const amp = amplitudes[j];
      const envelope = Math.exp(-5 * t);
      sample += Math.sin(2 * Math.PI * freq * t) * amp * envelope;
    }
    
    const value = Math.round(sample * 32767);
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, value)), 44 + i * 2);
  }
  
  // Fill rest with silence (zeros)
  for (let i = tingSamples; i < numSamples; i++) {
    buffer.writeInt16LE(0, 44 + i * 2);
  }
  
  return buffer;
}

/**
 * Create a simple "Ting" only sound (shorter version)
 */
function createSimpleTingSound() {
  const sampleRate = 44100;
  const duration = 0.5; // Shorter for notification
  const numSamples = Math.floor(sampleRate * duration);
  
  const buffer = Buffer.alloc(44 + numSamples * 2);
  
  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  
  // Generate bell sound
  const frequencies = [1000, 1500, 2000];
  const amplitudes = [0.5, 0.25, 0.15];
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    
    for (let j = 0; j < frequencies.length; j++) {
      const envelope = Math.exp(-8 * t); // Faster decay
      sample += Math.sin(2 * Math.PI * frequencies[j] * t) * amplitudes[j] * envelope;
    }
    
    const value = Math.round(sample * 32767);
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, value)), 44 + i * 2);
  }
  
  return buffer;
}

// Ensure directory exists
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

console.log('🔊 Generating RPM notification sounds...\n');

// Generate ting.wav (for use with expo-speech)
const tingBuffer = createTingSound();
fs.writeFileSync(tingFile, tingBuffer);
console.log('✅ Created ting.wav (0.8s bell sound)');
console.log('   Use with: Audio.Sound.createAsync(require("./assets/sounds/ting.wav"))');

// Generate rpm_notification.wav (for push notifications)
const rpmBuffer = createSimpleTingSound();
fs.writeFileSync(rpmFile, rpmBuffer);
console.log('✅ Created rpm_notification.wav (0.5s notification sound)');
console.log('   Used automatically for push notifications');

console.log('\n📱 Usage in your app:');
console.log('=====================================');
console.log(`
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

const playRPMSound = async () => {
  // 1. Phát tiếng "Ting" trước
  const { sound } = await Audio.Sound.createAsync(
    require('./assets/sounds/ting.wav')
  );
  await sound.playAsync();
  
  // 2. Đợi một chút rồi đọc "RPM"
  setTimeout(() => {
    Speech.speak('R P M', {
      language: 'en',
      pitch: 1.0,
      rate: 0.8, // Đọc chậm lại cho rõ
    });
  }, 800); // Đợi 0.8 giây sau tiếng Ting
  
  // 3. Cleanup sau khi xong
  setTimeout(async () => {
    await sound.unloadAsync();
  }, 3000);
};
`);
console.log('=====================================\n');

console.log('📝 Next steps:');
console.log('1. Install dependencies if needed:');
console.log('   npm install expo-speech expo-av');
console.log('');
console.log('2. Add the playRPMSound function to your component');
console.log('');
console.log('3. For push notifications, rebuild the app:');
console.log('   npx expo prebuild --clean');
console.log('   cd android && ./gradlew assembleRelease');
console.log('');
console.log('🎵 Sound characteristics:');
console.log('   - ting.wav: 0.8s bell sound (for in-app use with TTS)');
console.log('   - rpm_notification.wav: 0.5s notification (for push notifications)');
console.log('   - Both use pleasant bell-like frequencies');
console.log('   - Exponential decay for natural sound');