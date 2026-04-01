namespace Loupedeck.Test6Plugin
{
    using System;

    public class ToggleMultistateDynamicCommandWithParameters : PluginMultistateDynamicCommand
    {
        public ToggleMultistateDynamicCommandWithParameters()
        {
            this.DisplayName = "Toggle multistate command with parameters";
            this.GroupName = "Multistate w/parameters";

            this.AddState("Off", "Turn me off");
            this.AddState("On", "Turn me on");

            this.AddParameter("1", "(T) Channel 1", this.GroupName);
            this.AddParameter("2", "(T) Channel 2", this.GroupName);
            this.AddParameter("3", "(T) Channel 3", this.GroupName);
        }

        protected override String GetCommandDisplayName(String actionParameter, Int32 stateIndex, PluginImageSize imageSize) => $"CH {actionParameter}: {(0 == stateIndex ? "OFF" : "ON")}";

        protected override void RunCommand(String actionParameter) => this.ToggleCurrentState(actionParameter);
    }
}
