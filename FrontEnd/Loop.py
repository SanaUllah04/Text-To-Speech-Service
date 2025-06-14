

import json
with open('user_text.json', 'r') as f:
    data = json.load(f)
    texts = [data['text']]




texts = ["Bro woke up, scrolled his phone for like an hour, saw 15 memes, 3 cat videos, and some random dude arguing about sandwiches. Coffee hit different today, vibes were immaculate. Then he remembered he had like 7 tasks due but decided to vibe a bit more, because why not? Opened Spotify, blasted some weird hyperpop, and started doomscrolling again. Sun’s out, but he’s inside, staring at pixels. Life’s a simulation fr. Might touch grass later. Or not.",]










chat = ChatTTS.Chat()

chat.load()


wavs = chat.infer(texts)


torchaudio.save("C:\\Users\\SanaUllah\\Desktop\\TTS\\TTS_Output\\audio.wav", torch.from_numpy(wavs[0]).unsqueeze(0), 24000)