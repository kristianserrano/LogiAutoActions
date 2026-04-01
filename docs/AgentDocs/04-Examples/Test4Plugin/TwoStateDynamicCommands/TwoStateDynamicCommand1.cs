namespace Loupedeck.Test4Plugin
{
    using System;

    public class TwoStateDynamicCommand1 : PluginTwoStateDynamicCommand
    {
        public TwoStateDynamicCommand1()
        {
            this.DisplayName = "Two-state command (1)";
            this.Description = "Two-state command (1) description";
            this.GroupName = "Two-state";

            this.AddTurnOffCommand("(1) Turn me off", EmbeddedResources.ReadImage("Loupedeck.Test4Plugin.TwoStateDynamicCommands.TurnOff.png"))
                .SetDescription("(1) Turn me off description");
            this.AddTurnOnCommand("(1) Turn me on", EmbeddedResources.ReadImage("Loupedeck.Test4Plugin.TwoStateDynamicCommands.TurnOn.png"))
                .SetDescription("(1) Turn me on description");
            this.AddToggleCommand("(1) Toggle me", EmbeddedResources.ReadImage("Loupedeck.Test4Plugin.TwoStateDynamicCommands.Toggle1.png"), EmbeddedResources.ReadImage("Loupedeck.Test4Plugin.TwoStateDynamicCommands.Toggle2.png"))
                .SetDescription("(1) Toggle me description");
        }

        protected override void OnStateChanged(Boolean currentState) => this.Plugin.OnPluginStatusChanged(PluginStatus.Warning, $"Current state: '{currentState}'");
    }
}
