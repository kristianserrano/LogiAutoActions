namespace Loupedeck.Test4Plugin
{
    using System;

    public class ActionEditorCommandStartedEnded : ActionEditorCommand
    {
        private const String ControlName = "control";

        private String _message = "";

        public ActionEditorCommandStartedEnded()
        {
            this.DisplayName = "Action Editor / Started & Finished";
            this.GroupName = "Action Editor";

            this.ActionEditor.AddControl(
                new ActionEditorTextbox(name: ControlName, labelText: "Dummy:"));

            this.ActionEditor.Started += this.OnActionEditorStarted;
            this.ActionEditor.Finished += this.OnActionEditorFinished;
        }

        private void OnActionEditorStarted(Object sender, ActionEditorStartedEventArgs e)
        {
            Tracer.Trace("Action Editor: Started!");

            this.Update("Started;");
        }

        private void OnActionEditorFinished(Object sender, ActionEditorFinishedEventArgs e)
        {
            Tracer.Trace($"Action Editor: Finished({e.IsCanceled})!");

            this.Update($"Finished({e.IsCanceled});");
        }

        private void Update(String message)
        {
            this._message += message;
            this.Plugin.OnPluginStatusChanged(PluginStatus.Warning, this._message);
        }
    }
}
