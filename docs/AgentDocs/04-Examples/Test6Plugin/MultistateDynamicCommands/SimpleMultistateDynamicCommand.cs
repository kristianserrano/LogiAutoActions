namespace Loupedeck.Test6Plugin
{
    using System;

    public class SimpleMultistateDynamicCommand : PluginMultistateDynamicCommand
    {
        public SimpleMultistateDynamicCommand()
            : base("Simple multistate command", null, "Multistate")
        {
            this.AddState("State A", "Switch to state A");
            this.AddState("State B", "Switch to state B");
            this.AddState("State C", "Switch to state C");
        }

        protected override void RunCommand(String actionParameter)
        {
            this.IncrementCurrentState();

            var state = this.GetCurrentState(actionParameter);
            this.Plugin.OnPluginStatusChanged(PluginStatus.Warning, $"Plugin is in '{state.DisplayName}'");
        }
    }
}
