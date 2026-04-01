namespace Loupedeck.Test6Plugin
{
    using System;

    internal class DisabledCommand : PluginDynamicCommand
    {
        public DisabledCommand()
            : base("Disabled", "This command is permanently disabled", "Test")
        {
        }

        protected override Boolean OnLoad()
        {
            this.IsEnabled = false;
            return true;
        }
    }
}