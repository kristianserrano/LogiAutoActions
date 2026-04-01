namespace Loupedeck.Test4Plugin
{
    using System;

    public class SvgImageDynamicCommand : PluginDynamicCommand
    {
        private readonly Byte[] _imageBytes;

        public SvgImageDynamicCommand()
            : base("SVG action image", null, "Test")
        {
            var imageResourcePath = EmbeddedResources.FindFile("SvgImageDynamicCommand.svg");
            this._imageBytes = EmbeddedResources.ReadBinaryFile(imageResourcePath);
        }

        protected override BitmapImage GetCommandImage(String actionParameter, PluginImageSize imageSize) => BitmapImage.FromArray(this._imageBytes);
    }
}
