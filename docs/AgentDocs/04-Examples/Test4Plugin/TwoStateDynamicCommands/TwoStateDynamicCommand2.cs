namespace Loupedeck.Test4Plugin
{
    using System;

    public class TwoStateDynamicCommand2 : PluginTwoStateDynamicCommand
    {
        private MyProxy Proxy { get; } = new MyProxy();

        public TwoStateDynamicCommand2()
        {
            this.DisplayName = "Two-state command (2)";
            this.Description = "Two-state command (2) description";
            this.GroupName = "Two-state";

            this.AddTurnOffCommand("(2) Turn me off", EmbeddedResources.ReadImage("Loupedeck.Test4Plugin.TwoStateDynamicCommands.TurnOff.png"))
                .SetDescription("(2) Turn me off description");
            this.AddTurnOnCommand("(2) Turn me on", EmbeddedResources.ReadImage("Loupedeck.Test4Plugin.TwoStateDynamicCommands.TurnOn.png"))
                .SetDescription("(2) Turn me on description");
            this.AddToggleCommand("(2) Toggle me", EmbeddedResources.ReadImage("Loupedeck.Test4Plugin.TwoStateDynamicCommands.Toggle1.png"), EmbeddedResources.ReadImage("Loupedeck.Test4Plugin.TwoStateDynamicCommands.Toggle2.png"))
                .SetDescription("(2) Toggle me description");

            this.Proxy.CurrentStateChanged += this.OnProxyCurrentStateChanged;
        }

        protected override void RunCommand(TwoStateCommand command)
        {
            switch (command)
            {
                case TwoStateCommand.TurnOff:
                    this.Proxy.TurnOff();
                    break;
                case TwoStateCommand.TurnOn:
                    this.Proxy.TurnOn();
                    break;
                case TwoStateCommand.Toggle:
                    this.Proxy.Toggle();
                    break;
            }
        }

        private void OnProxyCurrentStateChanged(Object sender, MyProxyEventArgs e)
        {
            if (e.CurrentState)
            {
                this.TurnOn();
            }
            else
            {
                this.TurnOff();
            }
        }

        private class MyProxy
        {
            private Boolean _currentState = false;

            public event EventHandler<MyProxyEventArgs> CurrentStateChanged;

            public void TurnOff()
            {
                if (this._currentState)
                {
                    this.DoAction(() => this._currentState = false);
                }
            }

            public void TurnOn()
            {
                if (!this._currentState)
                {
                    this.DoAction(() => this._currentState = true);
                }
            }

            public void Toggle() => this.DoAction(() => this._currentState = !this._currentState);

            private void DoAction(Action action)
            {
                Helpers.StartNewTask(() =>
                {
                    System.Threading.Thread.Sleep(1_000);

                    action();

                    this.CurrentStateChanged?.BeginInvoke(this, new MyProxyEventArgs(this._currentState));
                });
            }
        }

        private class MyProxyEventArgs : EventArgs
        {
            public Boolean CurrentState { get; }

            public MyProxyEventArgs(Boolean currentState) => this.CurrentState = currentState;
        }
    }
}
