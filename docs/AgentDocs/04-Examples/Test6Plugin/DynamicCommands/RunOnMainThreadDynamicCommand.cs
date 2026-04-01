namespace Loupedeck.Test6Plugin
{
    using System;
    using System.Threading;

    using Loupedeck;

    public class RunOnMainThreadDynamicCommand : PluginDynamicCommand
    {
        public RunOnMainThreadDynamicCommand()
            : base("Main Thread", "", "")
        {
        }

        protected override Boolean OnLoad() => this.TestThreads("1");

        protected override Boolean OnUnload() => this.TestThreads("2");

        protected override void RunCommand(String actionParameter) => this.TestThreads("3");

        private Boolean TestThreads(String tag)
        {
            PrintThreadId("*");
            this.Plugin.NativeApi?.GetNativeGui().ExecuteOnMainThread(() => PrintThreadId("1"));

            return true;

            void PrintThreadId(String expected) => PluginLog.Error($"*** TAG {tag} THREAD EXPECTED {expected} ACTUAL {Thread.CurrentThread.ManagedThreadId}");
        }
    }
}