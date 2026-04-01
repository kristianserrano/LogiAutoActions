namespace Loupedeck.Test4Plugin
{
    using System;

    public class AnimatedImageDynamicCommand : PluginDynamicCommand
    {
        private readonly Byte[] _imageBytes;

        public AnimatedImageDynamicCommand()
            : base("Animated action image", null, "Test")
        {
            var imageResourcePath = EmbeddedResources.FindFile("AnimatedImageDynamicCommand.gif");
            this._imageBytes = EmbeddedResources.ReadBinaryFile(imageResourcePath);
        }

        protected override BitmapImage GetCommandImage(String actionParameter, PluginImageSize imageSize) => BitmapImage.FromArray(this._imageBytes);
    }
}
