import wave
import struct
import math
import os
import random

def generate_alarm_sound(filename, duration=1.8, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    
    # Hollow metal tube mode ratios
    MODES = [1.0, 2.76, 5.40, 8.93, 13.34]
    
    # 4 deep frequencies for 4 strikes
    FREQS = [110.0, 146.83, 196.00, 220.0]
    
    # 4 evenly dispersed start times
    STARTS = [0.1, 0.5, 0.9, 1.3]
    
    # Each strike gets two slightly detuned oscillators
    rods = []
    for i in range(len(FREQS)):
        freq = FREQS[i]
        start_time = STARTS[i]
        amp = random.uniform(0.5, 0.7)
        rods.append({"freq": freq * 0.998, "start": start_time, "amp": amp})
        rods.append({"freq": freq * 1.002, "start": start_time, "amp": amp})

    samples = []
    for i in range(num_samples):
        t = i / sample_rate
        val = 0.0
        
        # Gust of wind envelope - slow rise, slow tail
        if t < duration * 0.15:
            gust = math.sin(math.pi * (t / (duration * 0.3)))
        else:
            gust = math.cos(math.pi * 0.5 * (t - duration * 0.15) / (duration * 0.85))
            
        for rod in rods:
            if t < rod["start"]:
                continue
            
            dt = t - rod["start"]
            # Ultra slow decay for resounding sound
            strike_decay = math.exp(-dt * 0.3)
            
            for mode in MODES:
                m_freq = rod["freq"] * mode
                # Slower mode decay
                m_decay = math.exp(-dt * mode * 1.0)
                m_amp = (2.0 / (mode**1.1)) * rod["amp"]
                
                val += m_amp * m_decay * strike_decay * math.sin(2 * math.pi * m_freq * dt)
        
        # Master volume modulated by gust
        final_val = val * gust * 0.07 
        
        # Soft clipping
        sample = int(max(-32768, min(32767, final_val * 32767)))
        samples.append(sample)

    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with wave.open(filename, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sample_rate)
        for s in samples:
            f.writeframesraw(struct.pack('<h', s))

if __name__ == "__main__":
    target_path = "public/alarm.wav"
    generate_alarm_sound(target_path)
    print(f"Alarm sound generated successfully in {target_path}")
