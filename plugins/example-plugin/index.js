/**
 * GradeGuru Desktop Example Plugin
 * 
 * This is a comprehensive example plugin that demonstrates:
 * - Plugin registration and metadata
 * - Tool/command registration
 * - Event handling
 * - Lifecycle management (onLoad, onEnable, onDisable, onUnload)
 * - Using the plugin API
 * - Error handling
 * 
 * Copy this file as a template to create your own plugins!
 * 
 * @module example-plugin
 * @version 1.0.0
 */

// =============================================================================
// PLUGIN METADATA
// =============================================================================

/**
 * Plugin definition object
 * This is the main export that GradeGuru Desktop uses to load and manage the plugin.
 * 
 * @property {string} name - Unique identifier for the plugin (kebab-case)
 * @property {string} version - Semantic version (x.y.z)
 * @property {string} description - Human-readable description
 * @property {string} author - Plugin author name
 */
const plugin = {
  // ---------------------------------------------------------------------------
  // Metadata - Basic information about the plugin
  // ---------------------------------------------------------------------------
  name: 'example-plugin',
  version: '1.0.0',
  description: 'Example plugin demonstrating plugin development with tools and events',
  author: 'GradeGuru Team',

  // ---------------------------------------------------------------------------
  // State - Internal state for the plugin
  // ---------------------------------------------------------------------------
  
  /**
   * Internal API reference (set during onLoad)
   * @private
   */
  _api: null,

  /**
   * Track registered handlers for cleanup
   * @private
   */
  _handlers: [],

  /**
   * Configuration storage
   * @private
   */
  _config: {
    // Default greeting message
    defaultGreeting: 'Hello',
    // Enable/disable features
    features: {
      greeting: true,
      calculator: true,
      conversation: true,
      weather: false // Would require API key in production
    }
  },

  // =============================================================================
  // LIFECYCLE HOOKS
  // =============================================================================
  // Lifecycle hooks are called by GradeGuru Desktop at different stages
  // of the plugin's lifecycle. Use them to initialize, start, stop,
  // and clean up your plugin.
  // =============================================================================

  /**
   * onLoad - Called when plugin files are first loaded
   * 
   * This is the first lifecycle hook called. Use it to:
   * - Initialize internal state
   * - Load configuration
   * - Set up logging
   * 
   * @param {Object} api - The plugin API object
   * @returns {Promise<void>}
   */
  onLoad: async function(api) {
    // Store API reference for later use
    this._api = api;
    
    // Log that the plugin is loading
    api.logger.info('Example Plugin: Loading...');
    api.logger.info(`Version: ${this.version}`);
    api.logger.info(`Description: ${this.description}`);

    try {
      // -----------------------------------------------------------------------
      // Load saved settings (if any)
      // -----------------------------------------------------------------------
      const savedSettings = await api.getSettings();
      
      if (savedSettings) {
        // Merge saved settings with defaults
        this._config = {
          ...this._config,
          ...savedSettings
        };
        api.logger.info('Example Plugin: Loaded saved settings');
      } else {
        // First time load - save default config
        await api.setSettings(this._config);
        api.logger.info('Example Plugin: Saved default settings');
      }

      api.logger.info('Example Plugin: Load complete');
    } catch (error) {
      // Always handle errors in lifecycle hooks!
      api.logger.error('Example Plugin: Error during load', error);
      // Don't throw - allow plugin to continue with defaults
    }
  },

  /**
   * onEnable - Called when the plugin is enabled
   * 
   * This is where you should:
   * - Register commands (slash commands)
   * - Register event handlers
   * - Add UI components
   * - Start any services
   * 
   * @param {Object} api - The plugin API object
   * @returns {Promise<void>}
   */
  onEnable: async function(api) {
    api.logger.info('Example Plugin: Enabling...');

    try {
      // ========================================================================
      // REGISTER COMMANDS
      // ========================================================================
      // Commands are slash commands users can type in the chat
      // Format: /command-name arg1 arg2
      // ========================================================================

      // -----------------------------------------------------------------------
      // 1. Greeting Command
      // -----------------------------------------------------------------------
      api.registerCommand({
        name: 'greet',
        description: 'Greet the user with a personalized message',
        usage: '/greet [name]',
        examples: [
          '/greet',
          '/greet Alice'
        ],
        handler: this._handleGreet.bind(this)
      });

      // -----------------------------------------------------------------------
      // 2. Calculator Command
      // -----------------------------------------------------------------------
      api.registerCommand({
        name: 'calc',
        description: 'Perform basic arithmetic calculations',
        usage: '/calc <expression>',
        examples: [
          '/calc 2 + 2',
          '/calc 10 * 5',
          '/calc 100 / 4'
        ],
        handler: this._handleCalculator.bind(this)
      });

      // -----------------------------------------------------------------------
      // 3. Info Command - Show plugin info
      // -----------------------------------------------------------------------
      api.registerCommand({
        name: 'plugin-info',
        description: 'Show information about this plugin',
        usage: '/plugin-info',
        handler: this._handlePluginInfo.bind(this)
      });

      // -----------------------------------------------------------------------
      // 4. Settings Command - Show/change plugin settings
      // -----------------------------------------------------------------------
      api.registerCommand({
        name: 'plugin-settings',
        description: 'Show or update plugin settings',
        usage: '/plugin-settings [key=value]',
        examples: [
          '/plugin-settings',
          '/plugin-settings greeting=false'
        ],
        handler: this._handleSettings.bind(this)
      });

      api.logger.info('Example Plugin: Registered 4 commands');

      // ========================================================================
      // REGISTER EVENT HANDLERS
      // ========================================================================
      // Event handlers allow your plugin to react to things that happen
      // in the application, like messages being sent/received
      // ========================================================================

      // -----------------------------------------------------------------------
      // 1. Message Sent Handler - Process user messages
      // -----------------------------------------------------------------------
      const messageSentHandler = api.registerEventHandler({
        event: 'message:sent',
        handler: this._onMessageSent.bind(this)
      });
      this._handlers.push(messageSentHandler);

      // -----------------------------------------------------------------------
      // 2. Message Received Handler - Process AI responses
      // -----------------------------------------------------------------------
      const messageReceivedHandler = api.registerEventHandler({
        event: 'message:received',
        handler: this._onMessageReceived.bind(this)
      });
      this._handlers.push(messageReceivedHandler);

      // -----------------------------------------------------------------------
      // 3. Conversation Start Handler - New conversation started
      // -----------------------------------------------------------------------
      const conversationStartHandler = api.registerEventHandler({
        event: 'conversation:start',
        handler: this._onConversationStart.bind(this)
      });
      this._handlers.push(conversationStartHandler);

      // -----------------------------------------------------------------------
      // 4. Model Changed Handler - AI model was switched
      // -----------------------------------------------------------------------
      const modelChangedHandler = api.registerEventHandler({
        event: 'model:changed',
        handler: this._onModelChanged.bind(this)
      });
      this._handlers.push(modelChangedHandler);

      api.logger.info('Example Plugin: Registered 4 event handlers');

      // ========================================================================
      // ADD UI COMPONENTS (optional)
      // ========================================================================
      // Uncomment this to add a custom UI panel
      // 
      // api.addUIComponent({
      //   id: 'example-plugin-panel',
      //   position: 'sidebar',
      //   render: this._renderUI.bind(this)
      // });

      api.logger.info('Example Plugin: Enabled successfully');
    } catch (error) {
      api.logger.error('Example Plugin: Error during enable', error);
      throw error; // Re-throw to indicate failure
    }
  },

  /**
   * onDisable - Called when the plugin is disabled
   * 
   * Use this to:
   * - Remove event handlers
   * - Stop services
   * - Save state
   * - Clean up resources
   * 
   * @param {Object} api - The plugin API object
   * @returns {Promise<void>}
   */
  onDisable: async function(api) {
    api.logger.info('Example Plugin: Disabling...');

    try {
      // -----------------------------------------------------------------------
      // Clean up event handlers
      // -----------------------------------------------------------------------
      for (const handler of this._handlers) {
        if (typeof handler === 'function') {
          handler.unsubscribe();
        }
      }
      this._handlers = [];

      api.logger.info('Example Plugin: Disabled successfully');
    } catch (error) {
      api.logger.error('Example Plugin: Error during disable', error);
      // Don't throw - allow cleanup to continue
    }
  },

  /**
   * onUnload - Called when the plugin is being unloaded
   * 
   * Final cleanup hook. Use it to:
   * - Save final state
   * - Close connections
   * - Release all resources
   * 
   * @param {Object} api - The plugin API object
   * @returns {Promise<void>}
   */
  onUnload: async function(api) {
    api.logger.info('Example Plugin: Unloading...');

    try {
      // Save current config
      await api.setSettings(this._config);
      api.logger.info('Example Plugin: Saved final settings');

      // Clear references
      this._api = null;
      this._handlers = [];

      api.logger.info('Example Plugin: Unloaded');
    } catch (error) {
      api.logger.error('Example Plugin: Error during unload', error);
    }
  },

  // =============================================================================
  // COMMAND HANDLERS
  // =============================================================================
  // These functions handle the actual execution of slash commands
  // =============================================================================

  /**
   * Handle /greet command
   * 
   * @param {string[]} args - Command arguments
   * @param {Object} context - Chat context
   * @returns {Promise<string>} Response message
   */
  _handleGreet: async function(args, context) {
    const api = this._api;
    
    try {
      // Get name from args or use default
      const name = args.length > 0 ? args.join(' ') : 'there';
      
      // Get time-based greeting
      const hour = new Date().getHours();
      let timeGreeting = 'Hello';
      
      if (hour < 12) {
        timeGreeting = 'Good morning';
      } else if (hour < 18) {
        timeGreeting = 'Good afternoon';
      } else {
        timeGreeting = 'Good evening';
      }

      // Build response with emoji
      const response = `${timeGreeting}, ${name}! 👋\n\n`;
      response += `I'm the Example Plugin! I can help you with:\n`;
      response += `• /greet [name] - Greet someone\n`;
      response += `• /calc <expression> - Calculate math\n`;
      response += `• /plugin-info - Show plugin info\n`;
      response += `• /plugin-settings - Manage settings`;

      api.logger.info(`Greeted: ${name}`);
      
      return response;
    } catch (error) {
      api.logger.error('Error in greet command', error);
      return 'Sorry, something went wrong while greeting!';
    }
  },

  /**
   * Handle /calc command
   * 
   * @param {string[]} args - Command arguments (the expression)
   * @param {Object} context - Chat context
   * @returns {Promise<string>} Response message
   */
  _handleCalculator: async function(args, context) {
    const api = this._api;

    try {
      // Join all args to form the expression
      const expression = args.join(' ');
      
      if (!expression) {
        return 'Please provide an expression to calculate.\nUsage: /calc <expression>\nExample: /calc 2 + 2';
      }

      // Validate expression - only allow safe characters
      // This prevents command injection!
      const safePattern = /^[\d\s+\-*/().]+$/;
      if (!safePattern.test(expression)) {
        return 'Invalid expression! Only numbers and operators (+, -, *, /) are allowed.';
      }

      // Evaluate the expression (using Function for isolation)
      // In production, use a proper math library!
      let result;
      try {
        // Very limited eval for demonstration
        const sanitized = expression.replace(/[^0-9+\-*/().]/g, '');
        result = new Function(`return ${sanitized}`)();
        
        if (isNaN(result) || !isFinite(result)) {
          return `Invalid calculation result for: ${expression}`;
        }
      } catch (calcError) {
        return `Could not calculate: ${expression}\nError: ${calcError.message}`;
      }

      const response = `📊 **Calculator**\n\n`;
      response += `Expression: \`${expression}\`\n`;
      response += `Result: **${result}**`;

      api.logger.info(`Calculated: ${expression} = ${result}`);
      
      return response;
    } catch (error) {
      api.logger.error('Error in calc command', error);
      return 'Sorry, something went wrong with the calculation!';
    }
  },

  /**
   * Handle /plugin-info command
   * 
   * @param {string[]} args - Command arguments
   * @param {Object} context - Chat context
   * @returns {Promise<string>} Response message
   */
  _handlePluginInfo: async function(args, context) {
    const api = this._api;

    try {
      // Try to get conversation info
      let conversationInfo = 'N/A';
      try {
        const conversation = await api.getConversation();
        if (conversation) {
          conversationInfo = `ID: ${conversation.id}, Messages: ${conversation.messages?.length || 0}`;
        }
      } catch (e) {
        // Conversation access might not be available
        conversationInfo = 'Not available';
      }

      const response = `📦 **Example Plugin**\n\n`;
      response += `**Version:** ${this.version}\n`;
      response += `**Author:** ${this.author}\n`;
      response += `**Description:** ${this.description}\n\n`;
      response += `**Features:**\n`;
      response += Object.entries(this._config.features)
        .map(([key, enabled]) => `  • ${key}: ${enabled ? '✓' : '✗'}`)
        .join('\n');
      response += `\n\n**Current Conversation:** ${conversationInfo}`;

      return response;
    } catch (error) {
      api.logger.error('Error in plugin-info command', error);
      return 'Sorry, could not retrieve plugin info!';
    }
  },

  /**
   * Handle /plugin-settings command
   * 
   * @param {string[]} args - Command arguments (key=value or empty)
   * @param {Object} context - Chat context
   * @returns {Promise<string>} Response message
   */
  _handleSettings: async function(args, context) {
    const api = this._api;

    try {
      // If no args, show current settings
      if (args.length === 0) {
        const response = `⚙️ **Plugin Settings**\n\n`;
        response += `**Features:**\n`;
        response += Object.entries(this._config.features)
          .map(([key, value]) => `  • ${key}: ${value}`)
          .join('\n');
        response += `\n\nTo change a setting, use:\n/plugin-settings featureName=true|false`;
        
        return response;
      }

      // Parse key=value argument
      const setting = args.join(' ');
      const match = setting.match(/^(\w+)=(true|false)$/i);
      
      if (!match) {
        return 'Invalid format! Use: /plugin-settings featureName=true|false\nExample: /plugin-settings greeting=false';
      }

      const [, key, value] = match;
      
      // Validate the feature exists
      if (!(key in this._config.features)) {
        return `Unknown feature: ${key}\n\nAvailable features:\n${Object.keys(this._config.features).join(', ')}`;
      }

      // Update setting
      const boolValue = value.toLowerCase() === 'true';
      this._config.features[key] = boolValue;
      
      // Save to persistent storage
      await api.setSettings(this._config);

      api.logger.info(`Setting updated: ${key} = ${boolValue}`);

      return `✅ Setting updated!\n\n**${key}** is now **${boolValue ? 'enabled' : 'disabled'}**`;
    } catch (error) {
      api.logger.error('Error in plugin-settings command', error);
      return 'Sorry, could not update settings!';
    }
  },

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================
  // These functions are called when application events occur
  // =============================================================================

  /**
   * Handle message:sent event - when user sends a message
   * 
   * @param {Object} event - Event data
   * @param {Object} event.message - The message object
   * @returns {Promise<void>}
   */
  _onMessageSent: async function(event) {
    const api = this._api;
    
    try {
      const message = event.message;
      
      // Log the message (debug level - only shows with DEBUG mode)
      api.logger.debug(`User message: "${message.content}"`);
      
      // You could:
      // - Transform the message
      // - Add custom processing
      // - Trigger AI responses
      
      // Example: Check for specific triggers
      if (message.content.toLowerCase().includes('hello plugin')) {
        api.logger.info('User triggered plugin with "hello plugin"');
      }
    } catch (error) {
      api.logger.error('Error handling message:sent', error);
    }
  },

  /**
   * Handle message:received event - when AI responds
   * 
   * @param {Object} event - Event data
   * @param {Object} event.message - The message object
   * @returns {Promise<void>}
   */
  _onMessageReceived: async function(event) {
    const api = this._api;
    
    try {
      const message = event.message;
      
      // Log the response
      api.logger.debug(`AI response: "${message.content.substring(0, 100)}..."`);
      
      // You could:
      // - Analyze the response
      // - Add metadata
      // - Trigger follow-up actions
    } catch (error) {
      api.logger.error('Error handling message:received', error);
    }
  },

  /**
   * Handle conversation:start event - new conversation
   * 
   * @param {Object} event - Event data
   * @param {string} event.id - Conversation ID
   * @returns {Promise<void>}
   */
  _onConversationStart: async function(event) {
    const api = this._api;
    
    try {
      api.logger.info(`New conversation started: ${event.id}`);
      
      // You could:
      // - Initialize conversation-specific state
      // - Set up context
      // - Send a welcome message
    } catch (error) {
      api.logger.error('Error handling conversation:start', error);
    }
  },

  /**
   * Handle model:changed event - AI model was switched
   * 
   * @param {Object} event - Event data
   * @param {Object} event.model - The new model info
   * @returns {Promise<void>}
   */
  _onModelChanged: async function(event) {
    const api = this._api;
    
    try {
      const model = event.model;
      api.logger.info(`Model changed to: ${model.name || model.id}`);
      
      // You could:
      // - Adjust plugin behavior based on model capabilities
      // - Log the change
    } catch (error) {
      api.logger.error('Error handling model:changed', error);
    }
  },

  // =============================================================================
  // UI RENDERING (Optional)
  // =============================================================================
  // Uncomment in onEnable to add a custom UI panel
  // =============================================================================

  /**
   * Render custom UI component
   * 
   * @param {HTMLElement} container - Container element to render into
   */
  _renderUI: function(container) {
    const api = this._api;
    
    try {
      // Create the UI
      const panel = document.createElement('div');
      panel.className = 'example-plugin-panel';
      panel.innerHTML = `
        <h3>Example Plugin</h3>
        <p>This is a custom UI panel!</p>
        <div class="features">
          <h4>Features:</h4>
          <ul>
            <li>Greeting: ${this._config.features.greeting ? '✓' : '✗'}</li>
            <li>Calculator: ${this._config.features.calculator ? '✓' : '✗'}</li>
            <li>Conversation: ${this._config.features.conversation ? '✓' : '✗'}</li>
          </ul>
        </div>
        <button id="example-plugin-action">Click Me</button>
      `;
      
      // Add event listener
      const button = panel.querySelector('#example-plugin-action');
      button.addEventListener('click', () => {
        api.logger.info('UI button clicked!');
        alert('Hello from the Example Plugin!');
      });
      
      container.appendChild(panel);
      
      api.logger.info('Example Plugin: UI rendered');
    } catch (error) {
      api.logger.error('Error rendering UI', error);
    }
  }
};

// =============================================================================
// EXPORT
// =============================================================================

/**
 * Export the plugin definition
 * This is what GradeGuru Desktop loads when enabling the plugin
 */
module.exports = plugin;

// =============================================================================
// ADDITIONAL NOTES
// =============================================================================

/**
 * Available API Methods Reference:
 * 
 * registerCommand({ name, description, usage, handler }) - Register slash command
 * registerEventHandler({ event, handler }) - Subscribe to events
 * addUIComponent({ id, position, render }) - Add custom UI
 * getSettings([key]) - Get stored settings
 * setSettings(settings) - Save settings
 * getConversation() - Get current conversation
 * fetch(url, options) - Make HTTP requests (requires network permission)
 * 
 * Available Events:
 * - message:sent
 * - message:received
 * - model:changed
 * - conversation:start
 * - conversation:end
 * - settings:changed
 * 
 * Logger Methods:
 * - logger.info(message, ...args)
 * - logger.warn(message, ...args)
 * - logger.error(message, ...args)
 * - logger.debug(message, ...args)
 */
