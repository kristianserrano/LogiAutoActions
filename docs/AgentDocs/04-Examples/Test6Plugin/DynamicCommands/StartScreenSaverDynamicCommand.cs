namespace Loupedeck.Test6Plugin
{
    using System;
    using System.Runtime.InteropServices;

    internal class StartScreenSaverDynamicCommand : PluginDynamicCommand
    {
        public StartScreenSaverDynamicCommand()
            : base("Start Screen Saver", "Starts screen saver", "Test")
        {
        }

        protected override void RunCommand(String actionParameter)
        {
            var desktopWindow = GetDesktopWindow();
            SendMessage(desktopWindow, WM_SYSCOMMAND, new IntPtr(SC_SCREENSAVE), IntPtr.Zero);
        }

        private const UInt32 WM_SYSCOMMAND = 0x112;
        private const UInt32 SC_SCREENSAVE = 0xF140;
        
        [DllImport("user32.dll", EntryPoint = "GetDesktopWindow")]
        private static extern IntPtr GetDesktopWindow();

        [DllImport("User32.dll")]
        public static extern Int32 SendMessage(IntPtr hWnd, UInt32 Msg, IntPtr wParam, IntPtr lParam);
    }
}
