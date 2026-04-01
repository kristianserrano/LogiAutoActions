namespace Loupedeck.Test4Plugin
{
    using System;

    public class SimpleMultistateDynamicCommandWithParameters : PluginMultistateDynamicCommand
    {
        public SimpleMultistateDynamicCommandWithParameters()
        {
            this.DisplayName = "Toggle multistate command with parameters";
            this.GroupName = "Multistate w/parameters";

            for (var i = 0; i < 10; i++)
            {
                this.AddState($"{i}", $"State {i}");
            }

            for (var i = 1; i < 6; i++)
            {
                this.AddParameter($"{i}", $"(S) Channel {i}", this.GroupName);
            }
        }

        protected override String GetCommandDisplayName(String actionParameter, Int32 stateIndex, PluginImageSize imageSize) => $"CH {actionParameter} = {stateIndex}";

        protected override void RunCommand(String actionParameter)
        {
            this.IncrementCurrentState(actionParameter);

            var state = this.GetCurrentState(actionParameter);
            this.Plugin.OnPluginStatusChanged(PluginStatus.Warning, $"Channel {actionParameter} is now {state.DisplayName}");
        }
    }
}
