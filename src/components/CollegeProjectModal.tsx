import React, { useState } from 'react';
import { X, Copy, Check, Terminal, FileCode, BookOpen, Layers } from 'lucide-react';

interface CollegeProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TRAIN_MODELS_PY = `import pandas as pd
import pickle
import re
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, PassiveAggressiveClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'https?://\\S+|www\\.\\S+', '', text) # Remove URLs
    text = re.sub(r'\\[.*?\\]', '', text) # Remove square brackets
    text = re.sub(r'\\(reuters\\)', '', text) # Remove Reuters tag
    text = re.sub(r'\\w*\\d\\w*', '', text) # Remove words with numbers
    return text.strip()

# 1. Load Real/Fake CSVs or use built-in balanced sample dataset
if os.path.exists('Fake.csv') and os.path.exists('True.csv'):
    print("Loading external dataset (Fake.csv & True.csv)...")
    fake = pd.read_csv('Fake.csv').head(2000)
    true = pd.read_csv('True.csv').head(2000)
    fake['label'] = 0
    true['label'] = 1
    df = pd.concat([fake, true], axis=0).reset_index(drop=True)
else:
    print("CSV files not detected. Generating built-in balanced 20-row sample dataset...")
    data_samples = {
        'text': [
            "The central bank announced a 0.5% interest rate hike to combat inflation.",
            "Local ministry reports suggest a record harvest this year in the northern region.",
            "According to the official document, the trade agreement will begin next month.",
            "Scientists at the university have mapped the genome of the rare orchid.",
            "The city council voted to approve the new public transit expansion project.",
            "SHOCKING: This secret miracle fruit cures cancer overnight! Big Pharma hates this!",
            "You won't believe what this celebrity said about the lizard people ruling earth.",
            "URGENT: The world ends Friday! Click here to see the leaked NASA documents.",
            "VIRAL: This simple trick makes you $50,000 a day from home. No experience needed!",
            "REVEALED: The hidden truth about the moon landing being filmed in a basement.",
            "The annual report shows a steady increase in renewable energy adoption.",
            "Health officials recommend vaccines to prevent the spread of seasonal flu.",
            "BREAKING: Aliens found in Area 51! See the exclusive leaked video now!!",
            "Economic growth exceeded expectations in the third quarter, data shows.",
            "This miracle water can reverse aging. Scientists are stunned by the results!",
            "Government signs new environmental protection act for coastal waters.",
            "EXPOSED: The secret society controlling your mind through WiFi signals!",
            "New study finds that regular exercise improves mental clarity and focus.",
            "WATCH: He tried to jump over a car and what happened next is UNBELIEVABLE.",
            "Research indicates that sleep deprivation leads to long-term health risks."
        ],
        'label': [1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1]
    }
    df = pd.DataFrame(data_samples)

# 2. Text Cleaning
df['text'] = df['text'].apply(clean_text)
X = df['text']
y = df['label']

# 3. TF-IDF Feature Extraction
tfidf = TfidfVectorizer(stop_words='english', max_df=0.8, ngram_range=(1,2))
X_vec = tfidf.fit_transform(X)

X_train, X_test, y_train, y_test = train_test_split(X_vec, y, test_size=0.2, random_state=42)

# 4. Train 3-Model Ensemble
models = {
    'log_reg': LogisticRegression(),
    'nb': MultinomialNB(),
    'pac': PassiveAggressiveClassifier(max_iter=50)
}

print("\\n--- Training Ensemble Models ---")
for name, model in models.items():
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"[{name.upper()}] Test Accuracy: {acc*100:.1f}%")
    with open(f'{name}_model.pkl', 'wb') as f:
        pickle.dump(model, f)

with open('tfidf.pkl', 'wb') as f:
    pickle.dump(tfidf, f)

print("\\nSuccess: All models and tfidf.pkl saved cleanly to disk.")
`;

const APP_PY = `from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pickle
import sqlite3
import re
from textblob import TextBlob

app = Flask(__name__)
CORS(app)

# 1. Load Trained Ensemble Models & Vectorizer
tfidf = pickle.load(open('tfidf.pkl', 'rb'))
models = {
    'Logistic Regression': pickle.load(open('log_reg_model.pkl', 'rb')),
    'Multinomial Naive Bayes': pickle.load(open('nb_model.pkl', 'rb')),
    'Passive Aggressive': pickle.load(open('pac_model.pkl', 'rb'))
}

# 2. Initialize SQLite Database
def init_db():
    conn = sqlite3.connect('history.db')
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS history 
                      (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                       headline TEXT, result TEXT, confidence REAL,
                       clickbait_score INTEGER, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

init_db()

def get_clickbait_score(text):
    clickbait_words = ['shocking', 'unbelievable', 'you won\\'t believe', 'viral', 
                       'secret', 'revealed', 'miracle', 'exposed', 'clue', 'overnight', 'banned']
    count = 0
    found_words = []
    text_lower = text.lower()
    for word in clickbait_words:
        if word in text_lower:
            count += 1
            found_words.append(word)
    
    caps = len(re.findall(r'\\b[A-Z]{2,}\\b', text))
    punct = text.count('!') + text.count('?')
    score = min(100, (count * 22) + (caps * 5) + (punct * 4))
    return score, found_words

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json() or {}
    headline = data.get('headline', '')
    content = data.get('text', '')
    full_text = f"{headline} {content}".strip()

    if not full_text:
        return jsonify({"error": "Empty input"}), 400

    # 1. ML Ensemble Predictions
    vec_text = tfidf.transform([full_text.lower()])
    votes = []
    real_votes = 0

    for name, model in models.items():
        pred = model.predict(vec_text)[0]
        label = "REAL" if pred == 1 else "FAKE"
        if label == "REAL":
            real_votes += 1
        votes.append({"model": name, "label": label})

    verdict = "LIKELY REAL NEWS" if real_votes >= 2 else "LIKELY FAKE NEWS"
    confidence = round((real_votes / 3) * 100, 1) if verdict == "LIKELY REAL NEWS" else round(((3 - real_votes) / 3) * 100, 1)

    # 2. Emotion & Subjectivity via TextBlob
    blob = TextBlob(full_text)
    subjectivity = round(blob.sentiment.subjectivity * 100, 1)
    polarity = round(blob.sentiment.polarity, 2)

    # 3. Caps, Punctuation, and Clickbait Triggers
    caps_words = re.findall(r'\\b[A-Z]{2,}\\b', full_text)
    punct_count = full_text.count('!') + full_text.count('?')
    cb_score, cb_words = get_clickbait_score(full_text)

    # 4. Log to SQLite
    try:
        conn = sqlite3.connect('history.db')
        cursor = conn.cursor()
        cursor.execute("INSERT INTO history (headline, result, confidence, clickbait_score) VALUES (?, ?, ?, ?)",
                       (headline[:80], verdict, confidence, cb_score))
        conn.commit()
        cursor.execute("SELECT headline, result, confidence, clickbait_score FROM history ORDER BY id DESC LIMIT 5")
        recent = cursor.fetchall()
        conn.close()
    except Exception as e:
        recent = []

    return jsonify({
        "verdict": verdict,
        "confidence": confidence,
        "ensemble": votes,
        "metrics": {
            "subjectivity": subjectivity,
            "polarity": polarity,
            "caps": len(caps_words),
            "punctuation": punct_count,
            "clickbait_score": cb_score,
            "triggers": cb_words
        },
        "history": recent
    })

if __name__ == '__main__':
    print("fakeAI Flask Server starting at http://127.0.0.1:5000")
    app.run(port=5000, debug=True)
`;

const REQUIREMENTS_TXT = `flask==3.0.3
flask-cors==4.0.1
scikit-learn==1.5.0
pandas==2.2.2
textblob==0.18.0
`;

const TERMINAL_COMMANDS = `# Step 1: Install Python dependencies
pip install flask flask-cors scikit-learn pandas textblob
python -m textblob.download_corpora

# Step 2: Train Ensemble ML Models (generates .pkl files)
python train_models.py

# Step 3: Launch Flask Backend
python app.py

# Step 4: Access your web application in browser
# http://127.0.0.1:5000
`;

export const CollegeProjectModal: React.FC<CollegeProjectModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'train' | 'app' | 'req' | 'commands'>('train');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getActiveCode = () => {
    switch (activeTab) {
      case 'train':
        return { code: TRAIN_MODELS_PY, lang: 'python', filename: 'train_models.py' };
      case 'app':
        return { code: APP_PY, lang: 'python', filename: 'app.py' };
      case 'req':
        return { code: REQUIREMENTS_TXT, lang: 'text', filename: 'requirements.txt' };
      case 'commands':
        return { code: TERMINAL_COMMANDS, lang: 'bash', filename: 'terminal_setup.sh' };
    }
  };

  const current = getActiveCode();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#111726] border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl shadow-black overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0B0F19]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white font-['Plus_Jakarta_Sans',sans-serif]">
                College Project Source Code &amp; Flask Backend Files
              </h2>
              <span className="text-[11px] text-slate-400">
                100% production-ready Python files with scikit-learn ensemble &amp; TextBlob
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 pt-3 pb-2 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('train')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'train' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              train_models.py
            </button>
            <button
              onClick={() => setActiveTab('app')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'app' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              app.py (Flask)
            </button>
            <button
              onClick={() => setActiveTab('req')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'req' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              requirements.txt
            </button>
            <button
              onClick={() => setActiveTab('commands')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'commands' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Terminal Setup
            </button>
          </div>

          <button
            onClick={() => copyToClipboard(current.code, activeTab)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            {copiedKey === activeTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy File</span>
              </>
            )}
          </button>
        </div>

        {/* Code Content View */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0B0F19] font-mono text-xs text-slate-300 leading-relaxed">
          <pre className="whitespace-pre overflow-x-auto selection:bg-indigo-600 selection:text-white">
            <code>{current.code}</code>
          </pre>
        </div>

        {/* Modal Footer Note */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0B0F19] text-[11px] text-slate-500 flex items-center justify-between">
          <span>
            Tip: You can run this web app completely client-side in the browser, or connect it live to{' '}
            <code className="text-indigo-400">http://localhost:5000/predict</code> via the engine toggle.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
