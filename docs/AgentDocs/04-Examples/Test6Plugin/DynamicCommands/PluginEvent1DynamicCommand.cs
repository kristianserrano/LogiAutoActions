namespace Loupedeck.Test6Plugin
{
    using System;

    internal class PluginEvent1DynamicCommand : PluginDynamicCommand
    {
        private const String EventName = "buttonPress";

        public PluginEvent1DynamicCommand()
            : base("Plugin events (button press)", "Invokes plugin event on button press", "Test")
        {
        }

        protected override Boolean OnLoad()
        {
            this.Plugin.PluginEvents.AddEvent(EventName, "Button Press", "This event is sent when user presses a button");

            return true;
        }

        protected override void RunCommand(String actionParameter) => this.Plugin.PluginEvents.RaiseEvent(EventName);
    }
}