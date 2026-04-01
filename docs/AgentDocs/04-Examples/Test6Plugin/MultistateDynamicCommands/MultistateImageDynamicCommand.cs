namespace Loupedeck.Test6Plugin
{
    using System;

    public class MultistateImageDynamicCommand : PluginMultistateDynamicCommand
    {
        public MultistateImageDynamicCommand()
            : base("Multistate command with images", null, "Multistate")
        {
            this.AddState("State 1", "Switch to state 1");
            this.AddState("State 2", "Switch to state 2");
            this.AddState("State 3", "Switch to state 3");
        }

        protected override void RunCommand(String actionParameter)
        {
            var state = this.GetCurrentState(actionParameter);
            this.Plugin.OnPluginStatusChanged(PluginStatus.Warning, $"Plugin is in '{state.DisplayName}'");

            this.IncrementCurrentState();
        }

        protected override BitmapImage GetCommandImage(String actionParameter, Int32 stateIndex, PluginImageSize imageSize)
        {
            var displayName = this.States[stateIndex].DisplayName;
            var number = displayName[displayName.Length - 1];

            using (var bitmapBuilder = new BitmapBuilder(imageSize))
            {
                bitmapBuilder.DrawText(number.ToString());
                return bitmapBuilder.ToImage();
            }
        }
    }
}
