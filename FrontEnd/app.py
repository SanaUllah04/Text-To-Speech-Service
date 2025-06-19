# app.py - Flask Backend Server
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import subprocess
import os
import json
import tempfile
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Configuration
LIBRARIES_FILE = "Libraries.txt"
LOOP_FILE = "Loop.txt"
TEXT_STORAGE_FILE = "user_text.json"

@app.route('/api/start-session', methods=['POST'])
def start_session():
    """Handle the Start button click - install libraries"""
    try:
        # Check if Libraries.txt exists
        if not os.path.exists(LIBRARIES_FILE):
            return jsonify({
                'success': False, 
                'message': f'{LIBRARIES_FILE} not found in the current directory'
            }), 400
        
        print("Starting library installation...")
        
        # Read and install libraries from Libraries.txt
        with open(LIBRARIES_FILE, 'r') as f:
            libraries = f.read().strip().split('\n')
        
        # Filter out empty lines and comments
        libraries = [lib.strip() for lib in libraries if lib.strip() and not lib.strip().startswith('#')]
        
        installation_results = []
        
        for library in libraries:
            try:
                print(f"Installing {library}...")
                result = subprocess.run(
                    ['pip', 'install', library], 
                    capture_output=True, 
                    text=True, 
                    timeout=120
                )
                
                if result.returncode == 0:
                    installation_results.append(f"✅ {library}: Installed successfully")
                else:
                    installation_results.append(f"❌ {library}: {result.stderr}")
                    
            except subprocess.TimeoutExpired:
                installation_results.append(f"⏱️ {library}: Installation timeout")
            except Exception as e:
                installation_results.append(f"❌ {library}: {str(e)}")
        
        return jsonify({
            'success': True,
            'message': 'Library installation completed',
            'results': installation_results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error during library installation: {str(e)}'
        }), 500

@app.route('/api/save-text', methods=['POST'])
def save_text():
    """Save user text to storage file"""
    try:
        data = request.json
        user_text = data.get('text', '')
        
        # Save text with timestamp
        text_data = {
            'text': user_text,
            'timestamp': datetime.now().isoformat(),
            'word_count': len(user_text.split())
        }
        
        with open(TEXT_STORAGE_FILE, 'w') as f:
            json.dump(text_data, f, indent=2)
        
        print(f"Text saved: {len(user_text)} characters, {text_data['word_count']} words")
        
        return jsonify({
            'success': True,
            'message': 'Text saved successfully',
            'word_count': text_data['word_count']
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error saving text: {str(e)}'
        }), 500

@app.route('/api/convert-speech', methods=['POST'])
def convert_speech():
    """Handle TTS conversion - run Loop.py"""
    try:
        # Check if Loop.py exists
        if not os.path.exists(LOOP_FILE):
            return jsonify({
                'success': False,
                'message': f'{LOOP_FILE} not found in the current directory'
            }), 400
        
        # Check if text data exists
        if not os.path.exists(TEXT_STORAGE_FILE):
            return jsonify({
                'success': False,
                'message': 'No text data found. Please enter text first.'
            }), 400
        
        print("Starting TTS conversion...")
        
        # Run Loop.py
        result = subprocess.run(
            ['python', LOOP_FILE], 
            capture_output=True, 
            text=True, 
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode == 0:
            # Look for generated audio file
            audio_files = [f for f in os.listdir('.') if f.endswith(('.mp3', '.wav', '.m4a'))]
            latest_audio = None
            
            if audio_files:
                # Get the most recently created audio file
                latest_audio = max(audio_files, key=os.path.getctime)
            
            return jsonify({
                'success': True,
                'message': 'TTS conversion completed successfully',
                'output': result.stdout,
                'audio_file': latest_audio
            })
        else:
            return jsonify({
                'success': False,
                'message': f'TTS conversion failed: {result.stderr}',
                'output': result.stdout
            }), 500
            
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'message': 'TTS conversion timeout (5 minutes exceeded)'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error during TTS conversion: {str(e)}'
        }), 500

@app.route('/api/download-audio/<filename>')
def download_audio(filename):
    """Download generated audio file"""
    try:
        if os.path.exists(filename):
            return send_file(filename, as_attachment=True)
        else:
            return jsonify({'error': 'Audio file not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/status', methods=['GET'])
def status():
    """Check server status"""
    return jsonify({
        'status': 'running',
        'libraries_file': os.path.exists(LIBRARIES_FILE),
        'loop_file': os.path.exists(LOOP_FILE)
    })





# Add this route to app.py
@app.route('/api/get-text', methods=['GET'])
def get_text():
    """Retrieve text from user_text.json for terminal use"""
    try:
        if not os.path.exists(TEXT_STORAGE_FILE):
            return jsonify({'success': False, 'message': 'No text data found'}), 404
        with open(TEXT_STORAGE_FILE, 'r') as f:
            data = json.load(f)
        return jsonify({'success': True, 'text': data['text']})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500








if __name__ == '__main__':
    print("🚀 TTS Backend Server Starting...")
    print(f"📁 Current directory: {os.getcwd()}")
    print(f"📋 Libraries file: {'✅' if os.path.exists(LIBRARIES_FILE) else '❌'}")
    print(f"🔄 Loop file: {'✅' if os.path.exists(LOOP_FILE) else '❌'}")
    print("🌐 Server will run on http://localhost:5000")
    
    app.run(debug=True, host='localhost', port=5000)