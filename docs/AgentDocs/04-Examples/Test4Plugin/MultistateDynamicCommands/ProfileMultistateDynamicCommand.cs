namespace Loupedeck.Test4Plugin
{
    using System;

    public class ProfileMultistateDynamicCommand : PluginMultistateDynamicCommand
    {
        private const Int32 ChannelCount = 5;

        public ProfileMultistateDynamicCommand()
        {
            this.DisplayName = "Multistate profile command";
            this.GroupName = "Multistate";

            for (var i = 0; i < ChannelCount; i++)
            {
                this.AddParameter(i.ToString(), $"Channel {i}", this.GroupName);
            }

            this.MakeProfileAction("list");

            this.AddState("Off", "Turn off");
            this.AddState("On", "Turn on");
        }

        protected override void RunCommand(String actionParameter) => this.ToggleCurrentState(actionParameter);

        protected override String GetCommandDisplayName(String actionParameter, Int32 stateIndex, PluginImageSize imageSize)
            => $"Ch. {actionParameter}\r\n{(0 == stateIndex ? "Off" : "On")}";
    }
}
