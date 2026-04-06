# Geni CLI

**[Geni](https://geni.dev)** is a simple AI-powered command-line tool that lets you ask technical questions and get instant terminal commands — right from your terminal.

It responds with only the commands you need — no explanations, no clutter.


## Features

- Answers developer questions from terminal.
- Uses your own GEMINI_API_KEY if available.
- ~~Falls back to [api.geni.dev](https://api.geni.dev) if no API key is set.~~ Fallback api is deprectated.
- Simple output with no description.



## Installation

## ```npm install -g geni-dev```


##  Usage
Just type your question in the terminal:

```geni how to undo last git commit```

It will print only the terminal command(s) you need.

---


## Set your own Gemini API KEY 
Create and Connect your personal Google Gemini API key(free). 

1. Get your Gemini API Key:
 - Visit: https://ai.google.dev/gemini-api/docs/api-key
 - Copy your GEMINI_API_KEY 

2. Set the GEMINI_API_KEY environment variable:
 [How to set GEMINI_API_KEY' as environment variable.](https://ai.google.dev/gemini-api/docs/)

### Linux / macOS:

#### Add this line to your .bashrc, .zshrc, or .bash_profile:
``` export GEMINI_API_KEY=your-api-key-here ```
Then run:
```source ~/.bashrc   # or ~/.zshrc depending on your shell```

### Windows (persistent):

- Search for “Environment Variables” in Windows.
- Under System Variables or User Variables, click New.
- Add: Variable name: GEMINI_API_KEY value: your API key


