namespace Loupedeck.Test6Plugin
{
    internal class UpDownDynamicAdjustment : PluginDynamicAdjustment
    {
        public UpDownDynamicAdjustment()
            : base($"Up/down", "Generates up and down keyboard shortcuts", "Test", false)
        {
        }

        protected override void ApplyAdjustment(String actionParameter, Int32 ticks)
        {
            var virtaulKeyCode = ticks < 0 ? VirtualKeyCode.ArrowUp : VirtualKeyCode.ArrowDown;

            for (var i = 0; i < Math.Abs(ticks); i++)
            {
                this.Plugin.ClientApplication.SendKeyboardShortcut(virtaulKeyCode, ModifierKey.None);
            }
        }
    }
}