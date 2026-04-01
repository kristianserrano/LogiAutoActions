namespace Loupedeck.Test6Plugin
{
    using System;

    public class ToggleMultistateDynamicCommand : PluginMultistateDynamicCommand
    {
        public ToggleMultistateDynamicCommand()
            : base("Toggle multistate command", null, "Multistate")
        {
            this.AddState("Off", "Turn me off");
            this.AddState("On", "Turn me on");
        }

        protected override void RunCommand(String actionParameter) => this.ToggleCurrentState();
    }
}
