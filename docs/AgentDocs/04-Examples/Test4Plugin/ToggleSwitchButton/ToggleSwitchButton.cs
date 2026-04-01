namespace Loupedeck.Test4Plugin
{
    using System;

    public class ToggleSwitchButton : PluginDynamicCommand
    {
        private Boolean _toggleState = false;

        private readonly String _image0ResourcePath;
        private readonly String _image1ResourcePath;

        public ToggleSwitchButton() : base("Toggle Switch", null, "Test")
        {
            this._image0ResourcePath = EmbeddedResources.FindFile("ToggleSwitchButton0.png");
            this._image1ResourcePath = EmbeddedResources.FindFile("ToggleSwitchButton1.png");
        }

        protected override void RunCommand(String actionParameter)
        {
            this._toggleState = !this._toggleState;
            this.ActionImageChanged();
        }

        protected override BitmapImage GetCommandImage(String actionParameter, PluginImageSize imageSize)
        {
            if (this._toggleState)
            {
                return EmbeddedResources.ReadImage(this._image0ResourcePath);
            }
            else
            {
                return EmbeddedResources.ReadImage(this._image1ResourcePath);
            }
        }
    }
}
