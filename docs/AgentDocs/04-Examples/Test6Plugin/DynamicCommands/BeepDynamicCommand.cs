namespace Loupedeck.Test6Plugin
{
    using System;

    internal class BeepDynamicCommand : PluginDynamicCommand
    {
        INativeGui _nativeGuiApi;

        public BeepDynamicCommand()
            : base("Beep", "Plays the sound of a beep through the console speaker", "Test")
        {
        }

        protected override Boolean OnLoad()
        {
            this._nativeGuiApi = this.NativeApi.GetNativeGui();
            return true;
        }

        protected override void RunCommand(String actionParameter) => this._nativeGuiApi.Beep();
    }
}
