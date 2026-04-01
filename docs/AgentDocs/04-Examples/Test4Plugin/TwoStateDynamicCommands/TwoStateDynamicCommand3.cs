namespace Loupedeck.Test4Plugin
{
    using System;

    public class TwoStateDynamicCommand3 : PluginTwoStateDynamicCommand
    {
        public TwoStateDynamicCommand3()
            : base("Two-state command with states renamed", "Two-state command with states renamed description", "Two-state")
        {
            this.SetOffStateDisplayName("Recording off");
            this.SetOnStateDisplayName("Recording on");

            this.AddTurnOffCommand("(3) Turn recording off")
                .SetDescription("(3) Turn recording off description");
            this.AddTurnOnCommand("(3) Turn recording on")
                .SetDescription("(3) Turn recording on description");
            this.AddToggleCommand("(3) Toggle recording")
                .SetDescription("(3) Toggle recording description");
        }

        protected override void OnStateChanged(Boolean currentState) => this.Plugin.OnPluginStatusChanged(PluginStatus.Warning, $"Current state: '{currentState}'");
    }
}
