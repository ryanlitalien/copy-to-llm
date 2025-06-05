# CopyToLLM

A Chrome extension that extracts key debugging information from Rails error pages with a single click, formatted for efficient debugging with AI assistants like Claude.

## Features

- 🚀 One-click extraction of Rails errors
- 📋 Automatically copies formatted error info to clipboard
- 🎯 Extracts only the most relevant information
- 💡 Works with default Rails error pages and Better Errors gem
- 🔧 Minimal and efficient output for AI debugging

## Installation

### From Source (Development)

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/rails-error-extractor.git
   cd rails-error-extractor
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right

4. Click "Load unpacked" and select the extension directory

### From Chrome Web Store

*Coming soon*

## Usage

1. When you encounter a Rails error page, you'll see a floating "Extract Error" button in the bottom right corner

2. Click the button to extract and copy the error information to your clipboard

3. Paste the formatted error into your AI assistant for debugging help

## Example Output

```
Rails Error: NoMethodError
File: app/controllers/users_controller.rb:15
Message: undefined method `confirmed?' for nil:NilClass

Code Context:
13:   def show
14:     @user = User.find(params[:id])
15: >   if @user.confirmed?  # <-- ERROR HERE
16:       render :show
17:     else

Stack Trace:
- app/controllers/users_controller.rb:15:in `show'
- app/middleware/auth.rb:12:in `call'
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for the Rails community
- Designed to work efficiently with AI debugging assistants
- Inspired by the need to reduce token usage when debugging with Claude

## Support

If you find this extension helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs or requesting features via Issues
- 📣 Sharing with other Rails developers
